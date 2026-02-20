import './style.css'
import { workProjects, personalProjects } from './data/projects.js'



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



  // Modals Logic
  const dialog = document.createElement('dialog');
  dialog.id = 'project-modal';
  document.body.appendChild(dialog);

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  window.openProjectModal = (project) => {
    const techSummary = project.tags.length > 0
      ? `Built with <strong>${project.tags.join(', ')}</strong>.`
      : 'Built with modern web technologies.';

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
          This solution is engineered for performance and scalability. ${techSummary}
        </p>

        <a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" class="btn btn-primary" style="width: 100%; justify-content: center; color: var(--text-primary);">
          Visit Project
        </a>
      </div>
    `;
    dialog.showModal();
  };

  setupTypewriter();
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

const setupTypewriter = () => {
  const element = document.getElementById('typewriter-text');
  if (!element) return;

  const roles = [
    "& Engineer",
    "& AI Agent Builder",
    "& Drupal Architect",
    "& Chrome Ext. Dev"
  ];

  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  const style = document.createElement('style');
  style.textContent = `
    #typewriter-text::after {
      content: '|';
      position: absolute;
      right: -20px;
      animation: blink 1s step-end infinite;
      color: var(--text-primary);
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const type = () => {
    const currentRole = roles[roleIndex];

    if (isDeleting) {
      charIndex--;
      typingSpeed = 50;
    } else {
      charIndex++;
      typingSpeed = 100;
    }

    element.innerHTML = currentRole.substring(0, charIndex);

    if (!isDeleting && charIndex === currentRole.length) {
      typingSpeed = 2000; // Pause at the end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typingSpeed = 500; // Pause before typing next
    }

    setTimeout(type, typingSpeed);
  };

  // Start the typing effect
  setTimeout(type, 1000);
};

init();
