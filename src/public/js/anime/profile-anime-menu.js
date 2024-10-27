document.addEventListener('DOMContentLoaded', () => {
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');
    
    if (userMenuButton && userMenu) {
      userMenuButton.addEventListener('click', () => {
        userMenu.classList.toggle('hidden');
        if (userMenu.classList.contains('hidden')) {
          userMenu.classList.remove('menu-enter-active', 'menu-leave-active');
          userMenu.classList.add('menu-leave');
          setTimeout(() => {
            userMenu.classList.add('hidden');
            userMenu.classList.remove('menu-leave');
          }, 200);
        } else {
          userMenu.classList.remove('menu-leave', 'hidden');
          setTimeout(() => {
            userMenu.classList.add('menu-enter-active');
          }, 0);
        }
      });
  
      window.addEventListener('click', (event) => {
        if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
          userMenu.classList.add('hidden');
          userMenu.classList.remove('menu-enter-active', 'menu-leave-active');
        }
      });
    }
  });
  