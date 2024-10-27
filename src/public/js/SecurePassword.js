// Verifica si la contraseña cumple con criterios más relajados de seguridad
function enSecurePassword(contraseña) {
  const longitudMinima = 6; // Se reduce la longitud mínima a 6 caracteres
  const hasUpperCase = /[A-Z]/.test(contraseña);
  const hasLowerCase = /[a-z]/.test(contraseña);
  const hasNumber = /[0-9]/.test(contraseña);

  return (
    contraseña.length >= longitudMinima &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber // Eliminamos el carácter especial del requisito
  );
}

// Calcula el nivel de seguridad de la contraseña con criterios más relajados
function calculateSecurityPassword(contraseña) {
  let seguridad = 0;
  if (contraseña.length >= 6) seguridad += 10; // Penalización por longitud menor
  if (/[A-Z]/.test(contraseña)) seguridad += 15;
  if (/[a-z]/.test(contraseña)) seguridad += 15;
  if (/[0-9]/.test(contraseña)) seguridad += 15;
  if (contraseña.length >= 10) seguridad += 10; // Bonificación por longitud mayor

  return seguridad;
}

// Actualiza la barra de progreso en función de la seguridad de la contraseña
function updateProgressBar() {
  const contraseña = document.getElementById("password").value;
  const barraProgreso = document.getElementById("strengthBar");
  const seguridad = calculateSecurityPassword(contraseña);
  barraProgreso.value = seguridad;
  barraProgreso.classList.remove("is-danger", "is-warning", "is-success");

  if (seguridad < 30) {
    barraProgreso.classList.add("is-danger");
    document.getElementById("passwordStrength").textContent =
      "La contraseña es débil";
  } else if (seguridad < 60) {
    barraProgreso.classList.add("is-warning");
    document.getElementById("passwordStrength").textContent =
      "La contraseña es moderada";
  } else {
    barraProgreso.classList.add("is-success");
    document.getElementById("passwordStrength").textContent =
      "La contraseña es segura";
  }
}

// Valida el formulario al enviarlo
function validateForm() {
  const contraseña = document.getElementById("password").value;
  if (!enSecurePassword(contraseña)) {
    alert(
      "La contraseña debe tener al menos 6 caracteres, incluir al menos una letra mayúscula, una letra minúscula y un número."
    );
    return false;
  }
  return true;
}

// Añadir evento para validación en tiempo real
document
  .getElementById("password")
  .addEventListener("input", updateProgressBar);
