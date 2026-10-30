import {
  usuarioActual,
  verificarSesion,
  registrarUsuario,
  iniciarSesion,
  cerrarSesion
} from './auth.js';

import {
  obtenerSeriesBD,
  obtenerComentariosBD,
  subirImagenStorage,
  crearSerieBD,
  eliminarSerieBD,
  editarSerieBD,
  agregarComentarioBD
} from './series.js';

// Referencias del DOM
const tituloForm = document.getElementById('titulo-form');
const formAnime = document.getElementById('form-serie');
const gridSeries = document.getElementById('grid-series');
const btnCancelar = document.getElementById('btn-cancelar');

const seccionAuth = document.getElementById('seccion-auth');
const seccionFormulario = document.getElementById('formulario');
const formAuth = document.getElementById('form-auth');
const btnRegistro = document.getElementById('btn-registro');
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');

const IMAGEN_POR_DEFECTO = 'https://placehold.co/300x400?text=Sin+Portada';
let seriesCargadas = [];

// Evita que el texto de los usuarios se interprete como HTML
function escaparHTML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

//==============================================//
// SESIÓN: actualiza la interfaz según haya usuario o no

function actualizarInterfaz(usuario) {
  if (usuario) {
    seccionAuth.style.display = 'none';
    seccionFormulario.style.display = 'block';
    userInfo.textContent = usuario.email;
    btnLogout.style.display = 'inline-block';
  } else {
    seccionAuth.style.display = 'block';
    seccionFormulario.style.display = 'none';
    userInfo.textContent = 'Visitante';
    btnLogout.style.display = 'none';
    salirModoEdicion();
  }
  cargarSeries();
}

formAuth.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  const { error } = await iniciarSesion(email, password);
  if (error) {
    alert('No se pudo iniciar sesión: ' + error.message);
    return;
  }

  formAuth.reset();
  await verificarSesion(actualizarInterfaz);
});

btnRegistro.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || password.length < 6) {
    alert('Ingresá un email y una contraseña de al menos 6 caracteres.');
    return;
  }

  const { data, error } = await registrarUsuario(email, password);
  if (error) {
    alert('No se pudo registrar: ' + error.message);
    return;
  }

  if (data.session) {
    alert('¡Cuenta creada! Ya iniciaste sesión.');
    formAuth.reset();
    await verificarSesion(actualizarInterfaz);
  } else {
    alert('Cuenta creada. Revisá tu correo para confirmarla y luego iniciá sesión.');
  }
});

btnLogout.addEventListener('click', async () => {
  await cerrarSesion();
  await verificarSesion(actualizarInterfaz);
});

//==============================================//
// FUNCIÓN PARA CONSULTAR Y RENDERIZAR LAS SERIES

async function cargarSeries() {
  if (!gridSeries) return;

  gridSeries.innerHTML = '<p class="subtitle">Cargando recomendaciones...</p>';

  const [respSeries, respComentarios] = await Promise.all([
    obtenerSeriesBD(),
    obtenerComentariosBD()
  ]);

  if (respSeries.error) {
    console.error('Error al cargar series:', respSeries.error);
    gridSeries.innerHTML = '<p class="subtitle">Error al cargar las series.</p>';
    return;
  }
  if (respComentarios.error) {
    console.error('Error al cargar comentarios:', respComentarios.error);
  }

  seriesCargadas = respSeries.data || [];
  const listaComentarios = respComentarios.data || [];

  if (seriesCargadas.length === 0) {
    gridSeries.innerHTML = '<p class="subtitle">Aún no hay series recomendadas. ¡Sé el primero en publicar una!</p>';
    return;
  }

  gridSeries.innerHTML = '';

  seriesCargadas.forEach(serie => {
    const esDueno = usuarioActual && usuarioActual.email === serie.user_email;
    const comentariosSerie = listaComentarios.filter(c => c.serie_id === serie.id);

    const htmlComentarios = comentariosSerie.length
      ? comentariosSerie.map(c => `
          <div class="comentario-item"><strong>${escaparHTML(c.user_email)}</strong>: ${escaparHTML(c.texto)}</div>
        `).join('')
      : '<p class="sin-comentarios">Todavía no hay comentarios.</p>';

    const card = document.createElement('article');
    card.className = 'card-serie';

    card.innerHTML = `
      <img src="${escaparHTML(serie.imagen_url)}" alt="Portada de ${escaparHTML(serie.titulo)}" onerror="this.src='${IMAGEN_POR_DEFECTO}'">
      <div class="card-body">
        <div class="card-header-info">
          <span class="badge-genero">${escaparHTML(serie.genero || 'General')}</span>
          <span class="score">★ ${escaparHTML(serie.puntuacion || 0)}</span>
        </div>
        <h3 class="card-title">${escaparHTML(serie.titulo)}</h3>
        <p class="card-resena">${escaparHTML(serie.resena || '')}</p>
        <div class="card-footer-author">
          Recomendado por: ${escaparHTML(serie.user_email || 'Anónimo')}
        </div>
        ${esDueno ? `
        <div class="card-actions">
          <button type="button" class="btn-action btn-edit">✏️ Editar</button>
          <button type="button" class="btn-action btn-delete">🗑️ Eliminar</button>
        </div>` : ''}
        <div class="seccion-comentarios">
          <h4>Comentarios (${comentariosSerie.length})</h4>
          <div class="lista-comentarios">${htmlComentarios}</div>
          ${usuarioActual ? `
          <form class="form-comentario">
            <input type="text" placeholder="Escribí un comentario..." required>
            <button type="submit" class="btn-comentar">Enviar</button>
          </form>` : '<p class="aviso-login-comentario">Iniciá sesión para comentar.</p>'}
        </div>
      </div>
    `;

    const btnEdit = card.querySelector('.btn-edit');
    const btnDelete = card.querySelector('.btn-delete');
    if (btnEdit) btnEdit.addEventListener('click', () => editarSerie(serie.id));
    if (btnDelete) btnDelete.addEventListener('click', () => eliminarSerie(serie.id));

    const formComentario = card.querySelector('.form-comentario');
    if (formComentario) {
      formComentario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = formComentario.querySelector('input').value.trim();
        if (!texto) return;

        const { error } = await agregarComentarioBD(serie.id, texto, usuarioActual.email);
        if (error) {
          alert('Error al comentar: ' + error.message);
          return;
        }
        await cargarSeries();
      });
    }

    gridSeries.appendChild(card);
  });
}

//==============================================//
// ELIMINAR (DELETE)

async function eliminarSerie(id) {
  if (!confirm('¿Seguro que querés eliminar esta serie?')) return;

  const { data, error } = await eliminarSerieBD(id);

  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }

  // Si RLS bloquea el DELETE, no hay error pero tampoco se borra nada
  if (!data || data.length === 0) {
    alert('No se pudo eliminar. Solo el dueño de la publicación puede borrarla.');
    return;
  }

  alert('Serie eliminada con éxito.');

  // Si se borró la serie que se estaba editando, reseteamos el formulario
  if (document.getElementById('serie-id').value == id) {
    salirModoEdicion();
  }

  await cargarSeries();
}

// EDITAR: carga los datos de la tarjeta en el formulario
function editarSerie(id) {
  const serie = seriesCargadas.find(s => s.id === id);
  if (!serie) return;

  document.getElementById('serie-id').value = serie.id;
  document.getElementById('titulo').value = serie.titulo;
  document.getElementById('genero').value = serie.genero;
  document.getElementById('puntuacion').value = serie.puntuacion;
  document.getElementById('resena').value = serie.resena;

  formAnime.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  btnCancelar.style.display = 'block';
  tituloForm.textContent = 'Editar Recomendación';

  document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
}

// Vuelve el formulario al modo "crear"
function salirModoEdicion() {
  formAnime.reset();
  document.getElementById('serie-id').value = '';
  formAnime.querySelector('button[type="submit"]').textContent = 'Publicar Recomendación';
  btnCancelar.style.display = 'none';
  tituloForm.textContent = 'Recomendá una Serie';
}

btnCancelar.addEventListener('click', salirModoEdicion);

//==============================================//
// ENVÍO DEL FORMULARIO (INSERT o UPDATE)

formAnime.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!usuarioActual) {
    alert('Tenés que iniciar sesión para publicar.');
    return;
  }

  const btnSubmit = formAnime.querySelector('button[type="submit"]');
  const textoOriginal = btnSubmit.textContent;
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando...';

  try {
    const serieId = document.getElementById('serie-id').value;
    const titulo = document.getElementById('titulo').value.trim();
    const genero = document.getElementById('genero').value;
    const puntuacion = parseFloat(document.getElementById('puntuacion').value);
    const resena = document.getElementById('resena').value.trim();

    const archivo = document.getElementById('image-file').files[0];

    // Si se edita, conservamos la portada actual salvo que elijan una nueva
    let imagenUrl = IMAGEN_POR_DEFECTO;
    if (serieId) {
      const actual = seriesCargadas.find(s => String(s.id) === serieId);
      if (actual && actual.imagen_url) imagenUrl = actual.imagen_url;
    }

    if (archivo) {
      try {
        imagenUrl = await subirImagenStorage(archivo);
      } catch (errImagen) {
        throw new Error('Error al subir la imagen: ' + errImagen.message);
      }
    }

    if (serieId) {
      // UPDATE
      const datosActualizados = { titulo, genero, puntuacion, resena, imagen_url: imagenUrl };

      const { data, error } = await editarSerieBD(serieId, datosActualizados);

      if (error) throw new Error('Error al actualizar: ' + error.message);
      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar. Solo el dueño de la publicación puede editarla.');
      }

      alert('¡Serie actualizada con éxito!');
    } else {
      // INSERT
      const nuevoAnime = {
        titulo,
        genero,
        puntuacion,
        imagen_url: imagenUrl,
        resena,
        user_email: usuarioActual.email
      };

      const { error } = await crearSerieBD(nuevoAnime);

      if (error) throw new Error('Error al guardar en Supabase: ' + error.message);

      alert('¡Serie recomendada y guardada con éxito!');
    }

    salirModoEdicion();
    await cargarSeries();

  } catch (err) {
    alert(err.message);
    btnSubmit.textContent = textoOriginal;
  } finally {
    btnSubmit.disabled = false;
  }
});

//==============================================//
// INICIO: verificamos si hay una sesión activa

verificarSesion(actualizarInterfaz);