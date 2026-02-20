import './style.css'
import { workProjects, personalProjects } from './data/projects.js'
import VanillaTilt from 'vanilla-tilt';



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

  if (themeToggle) {
    // Initial icon state based on the inline head script
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    themeToggle.textContent = currentTheme === "light" ? "☀️" : "🌙";

    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const newTheme = isLight ? "dark" : "light";

      document.documentElement.setAttribute("data-theme", newTheme);
      themeToggle.textContent = newTheme === "light" ? "☀️" : "🌙";
      localStorage.setItem("theme", newTheme);

      // Update meta theme-color
      const themeMeta = document.getElementById('theme-color-meta');
      if (themeMeta) themeMeta.setAttribute('content', newTheme === "light" ? '#ffffff' : '#0f1115');
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

  // 3D Tilt Effect on Rendered Cards
  VanillaTilt.init(document.querySelectorAll(".project-card"), {
    max: 5,
    speed: 400,
    glare: true,
    "max-glare": 0.1,
  });

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

        <a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" class="btn btn-primary" style="width: 100%; justify-content: center; color: var(--text-primary);" data-track="click_modal_visit" data-track-category="projects" data-track-label="${project.title}">
          Visit Project
        </a>
      </div>
    `;
    dialog.showModal();
  };

  setupTypewriter();
  setupScrollReveal();

  setupTypewriter();
  setupScrollReveal();

  // Fire live API fetches without blocking render
  fetchGithubActivity();
  fetchDevtoArticles();

  // Global Telemetry Delegator
  document.addEventListener('click', (e) => {
    const trackElement = e.target.closest('[data-track]');
    if (trackElement) {
      const action = trackElement.getAttribute('data-track');
      const category = trackElement.getAttribute('data-track-category') || 'engagement';
      const label = trackElement.getAttribute('data-track-label') || '';

      if (typeof gtag !== 'undefined') {
        gtag('event', action, {
          'event_category': category,
          'event_label': label
        });
      }
    }
  });
};

const renderGrid = (elementId, data, config = { showLinkButton: true, isWork: false }) => {
  const grid = document.getElementById(elementId);
  if (!grid) return;

  if (data.length === 0) return;

  grid.innerHTML = data.map(project => `
        <article class="glass-panel project-card" style="overflow: hidden; display: flex; flex-direction: column; height: 100%; transform-style: preserve-3d;">
            <div class="skeleton" style="height: 200px; overflow: hidden; position: relative; border-radius: 8px 8px 0 0; transform: translateZ(20px);">
                ${config.isWork ? `<a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" style="display:block; height:100%;" aria-label="View ${project.title}" data-track="click_project_image" data-track-category="projects" data-track-label="${project.title}">` : ''}
                <img src="${project.image}" alt="${project.title} Preview" loading="lazy" decoding="async" class="img-loading" width="400" height="225"
                     style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;"
                     onload="this.classList.add('img-loaded'); this.parentElement.closest('.skeleton').classList.remove('skeleton');"
                     onerror="this.src='https://via.placeholder.com/400x225?text=No+Preview'; this.parentElement.closest('.skeleton').classList.remove('skeleton');">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); pointer-events: none;"></div>
                ${config.isWork ? `</a>` : ''}
            </div>
            
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; cursor: pointer; color: var(--primary);" 
                    onclick='window.openProjectModal(${JSON.stringify(project).replace(/'/g, "&#39;")})' data-track="click_project_title" data-track-category="projects" data-track-label="${project.title}">
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
                style="background: rgba(255,255,255,0.05); color: var(--text-primary); justify-content: center; flex: 1; border: 1px solid var(--card-border); font-size: 0.9rem;" data-track="click_project_details" data-track-category="projects" data-track-label="${project.title}">
                Details
            </button>
            ${config.showLinkButton ? `
            <a href="${project.link}" target="_blank" rel="nofollow noreferrer noopener" class="btn" style="background: rgba(255,255,255,0.05); color: var(--text-primary); justify-content: center; flex: 1; border: 1px solid var(--card-border); font-size: 0.9rem;" aria-label="View Code for ${project.title}" data-track="click_project_code" data-track-category="projects" data-track-label="${project.title}">
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

// API Integrations
const fetchGithubActivity = async () => {
  const container = document.getElementById('github-activity');
  if (!container) return;
  try {
    const res = await fetch('https://api.github.com/users/victorstack-ai/repos?sort=updated&per_page=3');
    const repos = await res.json();
    if (repos && repos.length > 0) {
      container.innerHTML = repos.map(repo => `
        <a href="${repo.html_url}" target="_blank" class="glass-panel project-card" style="display: block; padding: 1.5rem; text-decoration: none; transform-style: preserve-3d; border-left: 4px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.8rem;">
            <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">${repo.name}</h4>
            <span style="font-size: 0.8rem; background: rgba(108, 92, 231, 0.1); padding: 0.2rem 0.6rem; border-radius: 12px; color: var(--primary);">★ ${repo.stargazers_count}</span>
          </div>
          <p style="margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">${repo.description || 'No description available.'}</p>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); align-items: center;">
            <span style="display: flex; align-items: center; gap: 0.3rem;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--secondary);"></span> ${repo.language || 'Code'}</span>
            <span>Updated: ${new Date(repo.pushed_at).toLocaleDateString()}</span>
          </div>
        </a>
      `).join('');
      VanillaTilt.init(container.querySelectorAll(".project-card"), { max: 5, speed: 400, glare: true, "max-glare": 0.1 });
    } else {
      container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;"><p>No public activity found.</p></div>`;
    }
  } catch (e) {
    console.error("Failed to fetch Github activity", e);
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;"><p>Stats temporarily unavailable.</p></div>`;
  }
};

const fetchDevtoArticles = async () => {
  const grid = document.getElementById('writing-grid');
  if (!grid) return;
  try {
    const res = await fetch('https://dev.to/api/articles?username=victorstackai');
    const articles = await res.json();
    if (articles && articles.length > 0) {
      grid.innerHTML = articles.slice(0, 3).map(article => `
        <article class="glass-panel project-card" style="overflow: hidden; display: flex; flex-direction: column; height: 100%; transform-style: preserve-3d;">
            <div style="height: 200px; overflow: hidden; position: relative; border-radius: 8px 8px 0 0; transform: translateZ(20px);">
                <a href="${article.url}" target="_blank" rel="nofollow noreferrer noopener" style="display:block; height:100%;">
                <img src="${article.cover_image || article.social_image}" alt="${article.title}" loading="lazy" decoding="async" class="img-loaded" width="400" height="225"
                     style="width: 100%; height: 100%; object-fit: cover;">
                </a>
            </div>
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--primary);">
                    <a href="${article.url}" target="_blank" rel="nofollow noreferrer noopener">${article.title} ↗</a>
                </h3>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    ${article.tag_list.slice(0, 3).map(tag => `
                        <span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; background: rgba(255,255,255,0.05); border-radius: 12px; color: var(--text-secondary);">
                            #${tag}
                        </span>
                    `).join('')}
                </div>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; flex: 1;">
                    ${article.description}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary);">
                  <span>❤️ ${article.public_reactions_count}</span>
                  <span>📅 ${new Date(article.published_at).toLocaleDateString()}</span>
                </div>
            </div>
        </article>
      `).join('');
      VanillaTilt.init(grid.querySelectorAll(".project-card"), { max: 5, speed: 400, glare: true, "max-glare": 0.1 });
    } else {
      grid.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;"><p>No recent articles found.</p></div>`;
    }
  } catch (e) {
    console.error("Failed to fetch articles", e);
    grid.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;"><p>Tech blog feed temporarily down.</p></div>`;
  }
};

init();
