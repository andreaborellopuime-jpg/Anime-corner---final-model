import { supabase } from './supabaseClient.js';

export let usuarioActual = null;

export async function verificarSesion(alCambiarEstado) {
  const { data: { session } } = await supabase.auth.getSession();
  usuarioActual = session ? session.user : null;
  alCambiarEstado(usuarioActual);
}

/**
 * 2. REGISTRO DE USUARIO NUEVO
 * Registra en Supabase Auth. El guardado del email en la tabla 'users'
 * lo hace automáticamente un trigger de la base de datos (ver guardar_usuarios.sql),
 * así que acá no hace falta insertar nada a mano.
 */
export async function registrarUsuario(email, password) {
  return await supabase.auth.signUp({
    email: email,
    password: password
  });
}

export async function iniciarSesion(email, password) {
  const respuesta = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (!respuesta.error) {
    usuarioActual = respuesta.data.user;
  }
  return respuesta;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  usuarioActual = null;
}