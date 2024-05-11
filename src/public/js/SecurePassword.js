function enSecurePassword(contraseña) {
    const longitudMinima = 8;

    if (contraseña.length < longitudMinima) {
      return false;
    }

    if (!/[A-Z]/.test(contraseña)) {
      return false;
    }

    if (!/[a-z]/.test(contraseña)) {
      return false;
    }

    if (!/[0-9]/.test(contraseña)) {
      return false;
    }

    if (!/[^A-Za-z0-9]/.test(contraseña)) {
      return false;
    }

    return true;
  }

  function updateProgressBar() {
    const contraseña = document.getElementById("password").value;
    const barraProgreso = document.getElementById("strengthBar");
    const seguridad = calculateSecurityPassword(contraseña);
    barraProgreso.value = seguridad;
    barraProgreso.classList.remove("is-danger", "is-warning", "is-success");
    if (seguridad < 40) {
      barraProgreso.classList.add("is-danger");
      document.getElementById("passwordStrength").textContent = "La contraseña es débil";
    } else if (seguridad < 70) {
      barraProgreso.classList.add("is-warning");
      document.getElementById("passwordStrength").textContent = "La contraseña es moderada";
    } else {
      barraProgreso.classList.add("is-success");
      document.getElementById("passwordStrength").textContent = "La contraseña es segura";
    }
  }

  function calculateSecurityPassword(contraseña) {
    let seguridad = 0;
    seguridad += contraseña.length * 4;
    seguridad += (/[A-Z]/.test(contraseña)) ? 4 : 0;
    seguridad += (/[a-z]/.test(contraseña)) ? 4 : 0;
    seguridad += (/[0-9]/.test(contraseña)) ? 4 : 0;
    seguridad += (/[^A-Za-z0-9]/.test(contraseña)) ? 6 : 0;
    return seguridad;
  }

  function validateForm() {
    const contraseña = document.getElementById("password").value;
    if (!esContraseñaSegura(contraseña)) {
      alert("La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula, una letra minúscula, un número y un carácter especial.");
      return false;
    }
    return true;
  }
