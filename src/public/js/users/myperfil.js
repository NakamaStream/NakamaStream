document.addEventListener("DOMContentLoaded", () => {
    // Variables para Cropper.js
    let profileCropper;
    let bannerCropper;
  
    // Manejo del cambio de imagen de perfil
    document
      .getElementById("profileImageInput")
      .addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          const imageElement = document.getElementById("profileImage");
          imageElement.src = imageUrl;
          imageElement.classList.remove("hidden");
          document.getElementById("cropProfileImage").classList.remove("hidden");
  
          // Iniciar Cropper.js
          if (profileCropper) {
            profileCropper.destroy(); // Destruir cropper anterior si existe
          }
          profileCropper = new Cropper(imageElement, {
            aspectRatio: 1, // Proporción de 1:1 para la imagen de perfil
            viewMode: 1,
          });
        }
      });
  
    document
      .getElementById("cropProfileImage")
      .addEventListener("click", function () {
        if (profileCropper) {
          const croppedCanvas = profileCropper.getCroppedCanvas();
          croppedCanvas.toBlob((blob) => {
            const formData = new FormData();
            blob.name = "profileImage";
            formData.append("profileImage", blob);
            submitFormWithFile(formData, "/profile/update-profile-image");
          });
        }
      });
  
    // Manejo del cambio de imagen de banner
    document
      .getElementById("bannerImageInput")
      .addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          const imageElement = document.getElementById("bannerImage");
          imageElement.src = imageUrl;
          imageElement.classList.remove("hidden");
          document.getElementById("cropBannerImage").classList.remove("hidden");
  
          // Iniciar Cropper.js
          if (bannerCropper) {
            bannerCropper.destroy(); // Destruir cropper anterior si existe
          }
          bannerCropper = new Cropper(imageElement, {
            aspectRatio: 16 / 9, // Proporción de 16:9 para la imagen de banner
            viewMode: 1,
          });
        }
      });
  
    document
      .getElementById("cropBannerImage")
      .addEventListener("click", function () {
        if (bannerCropper) {
          const croppedCanvas = bannerCropper.getCroppedCanvas();
          croppedCanvas.toBlob((blob) => {
            const formData = new FormData();
            blob.name = "bannerImage";
            formData.append("bannerImage", blob);
            submitFormWithFile(formData, "/profile/update-banner-image");
          });
        }
      });
  
    // Fetch and display watched animes
    fetch("/api/watched-animes")
      .then((response) => response.json())
      .then((animes) => {
        const watchedAnimeList = document.getElementById("watchedAnimeList");
        watchedAnimeList.innerHTML = ""; // Clear existing content
        if (animes.length === 0) {
          watchedAnimeList.innerHTML =
            '<li class="text-center">No has visto ningún anime aún.</li>';
        } else {
          animes.forEach((watchedAnime, index) => {
            const li = document.createElement("li");
            li.className =
              "flex items-center space-x-4 bg-gray-100 p-3 rounded-lg transition-all duration-300 hover:bg-gray-200";
            li.innerHTML = `
                          <img src="${watchedAnime.imageUrl}" alt="${
              watchedAnime.name
            }" class="w-12 h-12 rounded-full object-cover">
                          <div class="flex-grow">
                              <a href="/anime/${watchedAnime.slug}/episode/${
              watchedAnime.episode_id
            }" class="hover:text-purple-600 transition-colors duration-300">${
              watchedAnime.name
            } - ${watchedAnime.episode_title}</a>
                              <p class="text-sm text-gray-500">Visto el: ${new Date(
                                watchedAnime.watched_at
                              ).toLocaleDateString()}</p>
                          </div>
                      `;
            watchedAnimeList.appendChild(li);
  
            // Animate list items
            anime({
              targets: li,
              opacity: [0, 1],
              translateY: [20, 0],
              delay: index * 100,
              easing: "easeOutExpo",
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching watched animes:", error);
        document.getElementById("watchedAnimeList").innerHTML =
          '<li class="text-center text-red-500">Error al cargar el historial de animes vistos.</li>';
      });
  
    // Fetch and display favorite animes
    fetch("/api/favorite-animes")
      .then((response) => response.json())
      .then((animes) => {
        const favoriteAnimeList = document.getElementById("favoriteAnimeList");
        favoriteAnimeList.innerHTML = ""; // Clear existing content
        if (animes.length === 0) {
          favoriteAnimeList.innerHTML =
            '<li class="text-center">No tienes animes favoritos aún.</li>';
        } else {
          animes.forEach((favoriteAnime, index) => {
            const li = document.createElement("li");
            li.className =
              "flex items-center space-x-4 bg-gray-100 p-3 rounded-lg transition-all duration-300 hover:bg-gray-200";
            li.innerHTML = `
                          <img src="${favoriteAnime.imageUrl}" alt="${favoriteAnime.name}" class="w-12 h-12 rounded-full object-cover">
                          <a href="/anime/${favoriteAnime.slug}" class="hover:text-purple-600 transition-colors duration-300">${favoriteAnime.name}</a>
                      `;
            favoriteAnimeList.appendChild(li);
  
            // Animate list items
            anime({
              targets: li,
              opacity: [0, 1],
              translateY: [20, 0],
              delay: index * 100,
              easing: "easeOutExpo",
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching favorite animes:", error);
        document.getElementById("favoriteAnimeList").innerHTML =
          '<li class="text-center text-red-500">Error al cargar los animes favoritos.</li>';
      });
  
    // Add some animations to the anime cards
    anime({
      targets: ".anime-card",
      scale: [0.9, 1],
      opacity: [0, 1],
      delay: anime.stagger(200),
      duration: 1000,
      easing: "easeOutElastic(1, .5)",
    });
  
    // Handle form submissions
    document
      .getElementById("updateInfoForm")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        submitForm(this, "/profile/update-info");
      });
  
    document
      .getElementById("changePasswordForm")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword =
          document.getElementById("confirmNewPassword").value;
  
        if (newPassword !== confirmNewPassword) {
          alert("Las nuevas contraseñas no coinciden");
          return;
        }
  
        submitForm(this, "/profile/update-password");
      });
  
    function submitForm(form, url) {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert(data.message);
            // Reload the page to reflect changes
            window.location.reload();
          } else {
            alert(data.error || "An error occurred");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred while updating the profile");
        });
    }
  
    function submitFormWithFile(formData, url) {
      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            alert(data.message);
            // Reload the page to reflect changes
            window.location.reload();
          } else {
            alert(data.error || "An error occurred while updating the image");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred while updating the image: " + error.message);
        });
    }
  });
  