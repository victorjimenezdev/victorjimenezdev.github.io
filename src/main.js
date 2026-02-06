import './style.css'
import { workProjects, personalProjects } from './data/projects.js'

const TECH_STACK = [
  { name: 'Drupal', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/></svg>' }, // Drupal drop simplified
  { name: 'WordPress', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.64 5.93h1.33v1.94h-1.33zm-4.75 0h1.33v1.94H6.89zm9.5 0h1.33v1.94h-1.33zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' }, // WP W simplified
  { name: 'React', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' }, // React Atom simplified
  { name: 'Next.js', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' }, // "N" simplified
  { name: 'Vite', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 12a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5v-2zm4.5-5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H7.5a.5.5 0 01-.5-.5V7zm4.5 5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2zm4.5-5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H16.5a.5.5 0 01-.5-.5V7zM12 2L2 22h20L12 2zm0 3.5l6 12H6l6-12z"/></svg>' }, // Simulated Vite Logo
  { name: 'Node.js', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' },
  { name: 'PHP 8', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM8.5 14H7v-4h1.5a1.5 1.5 0 010 3H7v1zm4 0h-1.5v-4H12a1.5 1.5 0 010 3h-.5v1zm4-4h-1.5v4H15v-1.5h1.5v-1H15v-1.5z"/></svg>' }, // Simplified PHP
  { name: 'MySQL', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' }, // Simplified DB Icon
  { name: 'AWS', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11.5a2.5 2.5 0 011.25-2.17 2.5 2.5 0 00-2.25-2.33c-1.07-.11-2.07.63-2.6 1.25-.53-.62-1.53-1.36-2.6-1.25a2.5 2.5 0 00-2.25 2.33 2.5 2.5 0 011.25 2.17c0 1.38-1.12 2.5-2.5 2.5v1.5c2.48 0 4.5-2.02 4.5-4.5h1.5c0 2.48 2.02 4.5 4.5 4.5v-1.5c-1.38 0-2.5-1.12-2.5-2.5z"/></svg>' }, // Cloud-like
  { name: 'Docker', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h2v2H4zm3 0h2v2H7zm3 0h2v2h-2zm-6 3h2v2H4zm3 0h2v2H7zm3 0h2v2h-2zm3 0h2v2h-2zm-9 3h2v2H4zm3 0h2v2H7zm3 0h2v2h-2zm3 0h2v2h-2zm3 0h2v2h-2zM2 15h1v4.5A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V15h1v-4.6c0-2-2-3-4-3H4c-2 0-4 1-4 3V15z"/></svg>' }, // Container-like
  { name: 'GraphQL', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-9.5 5.5v11L12 24l9.5-5.5v-11L12 2zm0 2.2l7.5 4.3v8.6L12 21.4 4.5 17.1V8.5L12 4.2z"/></svg>' }
];

// Main entry point

const init = () => {
  // Mobile Navigation Logic
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (mobileBtn && mobileNav) {
    mobileBtn.addEventListener('click', () => {
      const isHidden = mobileNav.style.display === 'none';
      mobileNav.style.display = isHidden ? 'flex' : 'none';
    });

    // Close menu when clicking a link
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.style.display = 'none';
      });
    });
  }

  // Theme Toggle Logic
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme == "light") {
    document.body.setAttribute("data-theme", "light");
    if (themeToggle) themeToggle.textContent = "☀️";
  } else {
    document.body.setAttribute("data-theme", "dark");
    if (themeToggle) themeToggle.textContent = "🌙";
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.body.getAttribute("data-theme");
      let newTheme = "light";
      let newIcon = "☀️";

      if (currentTheme === "light") {
        newTheme = "dark";
        newIcon = "🌙";
      }

      document.body.setAttribute("data-theme", newTheme);
      themeToggle.textContent = newIcon;
      localStorage.setItem("theme", newTheme);
    });
  }

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }

  // Render Work Projects (hide button, make image clickable)
  renderGrid('work-grid', workProjects, { showLinkButton: false, isWork: true });

  // Render Personal Projects (show button)
  renderGrid('projects-grid', personalProjects, { showLinkButton: true, isWork: false });

  // Scroll Progress Logic
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercent = (scrollTop / scrollHeight) * 100;
      progressBar.style.width = scrollPercent + '%';
    });
  }

  // Back to Top Logic
  const backToTopBtn = document.getElementById('back-to-top');

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
        requestAnimationFrame(() => {
          backToTopBtn.style.opacity = '1';
          backToTopBtn.style.transform = 'translateY(0)';
        });
      } else {
        backToTopBtn.style.opacity = '0';
        backToTopBtn.style.transform = 'translateY(20px)';
        setTimeout(() => {
          if (window.scrollY <= 300) backToTopBtn.style.display = 'none';
        }, 300);
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Marquee Logic
  const marqueeTrack = document.querySelector('.tech-marquee-track');
  if (marqueeTrack) {
    const icons = TECH_STACK.map(tech => `
      <div class="tech-icon">
        ${tech.icon}
        <span style="font-size: 0.9rem; font-weight: 500;">${tech.name}</span>
      </div>
    `).join('');
    // Duplicate for infinite scroll
    marqueeTrack.innerHTML = icons + icons + icons + icons;
  }

  // Modals Logic
  const dialog = document.createElement('dialog');
  dialog.id = 'project-modal';
  document.body.appendChild(dialog);

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  window.openProjectModal = (project) => {
    dialog.innerHTML = `
      <div style="text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem;">
          <h2 style="font-size: 2rem; color: var(--text-primary); margin: 0;">${project.title}</h2>
          <button onclick="document.getElementById('project-modal').close()" style="background: none; border: none; color: var(--text-secondary); font-size: 2rem; cursor: pointer;">&times;</button>
        </div>
        
        <img src="${project.image}" alt="${project.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; border: 1px solid var(--card-border);">
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          ${project.tags.map(tag => `
              <span style="font-size: 0.85rem; padding: 0.3rem 0.8rem; background: rgba(108, 92, 231, 0.1); border-radius: 20px; color: var(--primary);">
                  ${tag}
              </span>
          `).join('')}
        </div>

        <p style="color: var(--text-secondary); font-size: 1.1rem; line-height: 1.7; margin-bottom: 2rem;">
          ${project.description} <br><br>
          This project demonstrates high-performance architecture and seamless user experience.
          Built with robust technologies to ensure scalability and accessibility.
        </p>

        <a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" class="btn btn-primary" style="width: 100%; justify-content: center;">
          Visit Project
        </a>
      </div>
    `;
    dialog.showModal();
  };

  setupScrollReveal();
};

const renderGrid = (elementId, data, config = { showLinkButton: true, isWork: false }) => {
  const grid = document.getElementById(elementId);
  if (!grid) return;

  if (data.length === 0) return;

  grid.innerHTML = data.map(project => `
        <article class="glass-panel project-card" style="overflow: hidden; display: flex; flex-direction: column; height: 100%;">
            <div class="skeleton" style="height: 200px; overflow: hidden; position: relative; border-radius: 8px 8px 0 0;">
                ${config.isWork ? `<a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" style="display:block; height:100%;" aria-label="View ${project.title}">` : ''}
                <img src="${project.image}" alt="${project.title} Preview" loading="lazy" class="img-loading" width="400" height="225"
                     style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;"
                     onload="this.classList.add('img-loaded'); this.parentElement.closest('.skeleton').classList.remove('skeleton');"
                     onerror="this.src='https://via.placeholder.com/400x225?text=No+Preview'; this.parentElement.closest('.skeleton').classList.remove('skeleton');">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); pointer-events: none;"></div>
                ${config.isWork ? `</a>` : ''}
            </div>
            
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; cursor: pointer; color: var(--primary);" 
                    onclick='window.openProjectModal(${JSON.stringify(project).replace(/'/g, "&#39;")})'>
                    ${project.title} ↗
                </h3>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    ${project.tags.map(tag => `
                        <span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; background: rgba(255,255,255,0.05); border-radius: 12px; color: var(--text-secondary);">
                            ${tag}
                        </span>
                    `).join('')}
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; flex: 1;">
                    ${project.description}
                </p>
                
        <div style="display: flex; gap: 0.5rem; margin-top: auto;">
            <button class="btn" onclick='window.openProjectModal(${JSON.stringify(project).replace(/'/g, "&#39;")})'
                style="background: rgba(255,255,255,0.05); color: var(--text-primary); justify-content: center; flex: 1; border: 1px solid var(--card-border); font-size: 0.9rem;">
                Details
            </button>
            ${config.showLinkButton ? `
            <a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" class="btn" style="background: rgba(255,255,255,0.05); color: var(--text-primary); justify-content: center; flex: 1; border: 1px solid var(--card-border); font-size: 0.9rem;" aria-label="View Code for ${project.title}">
                Code
            </a>
            ` : ''}
        </div>
            </div>
        </article>
    `).join('');

  // Add hover effect logic
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const img = card.querySelector('img');
      // Only scale if image is loaded to avoid jumping
      if (img && img.classList.contains('img-loaded')) img.style.transform = 'scale(1.1)';
    });
    card.addEventListener('mouseleave', () => {
      const img = card.querySelector('img');
      if (img) img.style.transform = 'scale(1)';
    });
  });
};

const setupScrollReveal = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -50px 0px' });

  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    section.classList.add('reveal-init');
    observer.observe(section);
  });
};

init();
