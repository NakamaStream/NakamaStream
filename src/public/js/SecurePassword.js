// Verifica si la contraseña cumple con los criterios básicos de seguridad
function enSecurePassword(contraseña) {
  const longitudMinima = 8;
  const hasUpperCase = /[A-Z]/.test(contraseña);
  const hasLowerCase = /[a-z]/.test(contraseña);
  const hasNumber = /[0-9]/.test(contraseña);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(contraseña);

  return (
    contraseña.length >= longitudMinima &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
}

// Calcula el nivel de seguridad de la contraseña
function calculateSecurityPassword(contraseña) {
  let seguridad = 0;
  if (contraseña.length >= 8) seguridad += 10; // Penalización por longitud menor
  if (/[A-Z]/.test(contraseña)) seguridad += 15;
  if (/[a-z]/.test(contraseña)) seguridad += 15;
  if (/[0-9]/.test(contraseña)) seguridad += 15;
  if (/[^A-Za-z0-9]/.test(contraseña)) seguridad += 20;
  if (contraseña.length >= 12) seguridad += 10; // Bonificación por longitud mayor

  return seguridad;
}

// Actualiza la barra de progreso en función de la seguridad de la contraseña
function updateProgressBar() {
  const contraseña = document.getElementById("password").value;
  const barraProgreso = document.getElementById("strengthBar");
  const seguridad = calculateSecurityPassword(contraseña);
  barraProgreso.value = seguridad;
  barraProgreso.classList.remove("is-danger", "is-warning", "is-success");

  if (seguridad < 40) {
    barraProgreso.classList.add("is-danger");
    document.getElementById("passwordStrength").textContent =
      "La contraseña es débil";
  } else if (seguridad < 70) {
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
      "La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula, una letra minúscula, un número y un carácter especial."
    );
    return false;
  }
  return true;
}

// Añadir evento para validación en tiempo real
document
  .getElementById("password")
  .addEventListener("input", updateProgressBar);
