import { supabase } from './supabaseClient.js';

// Obtener todas las series
export async function obtenerSeriesBD() {
  return await supabase
    .from('animes')
    .select('*')
    .order('id', { ascending: false });
}

// Obtener todos los comentarios
export async function obtenerComentariosBD() {
  return await supabase
    .from('comentarios')
    .select('*')
    .order('created_at', { ascending: true });
}

// Subir imagen al Bucket 'portadas'
export async function subirImagenStorage(archivo) {
  const nombreArchivo = `${Date.now()}_${archivo.name}`;

  const { error: storageError } = await supabase.storage
    .from('portadas')
    .upload(nombreArchivo, archivo);

  if (storageError) throw storageError;

  const { data: urlData } = supabase.storage
    .from('portadas')
    .getPublicUrl(nombreArchivo);

  return urlData.publicUrl;
}

// Guardar nueva serie
export async function crearSerieBD(nuevaSerie) {
  return await supabase.from('animes').insert([nuevaSerie]);
}

// Borrar serie
export async function eliminarSerieBD(id) {
  return await supabase.from('animes').delete().eq('id', id).select();
}

// Editar serie (recibe un objeto con los campos a actualizar)
export async function editarSerieBD(id, datos) {
  return await supabase
    .from('animes')
    .update(datos)
    .eq('id', id)
    .select();
}

// Agregar comentario
export async function agregarComentarioBD(serieId, texto, userEmail) {
  return await supabase.from('comentarios').insert([
    {
      serie_id: serieId,
      texto: texto,
      user_email: userEmail
    }
  ]);
}