import './style.css'
import { workProjects, personalProjects } from './data/projects.js'

// Main entry point

const init = () => {
  // Render Work Projects (hide button, make image clickable)
  renderGrid('work-grid', workProjects, { showLinkButton: false });

  // Render Personal Projects (show button)
  renderGrid('projects-grid', personalProjects, { showLinkButton: true });

  setupScrollReveal();
};

const renderGrid = (elementId, data, config = { showLinkButton: true }) => {
  const grid = document.getElementById(elementId);
  if (!grid) return;

  if (data.length === 0) return;

  grid.innerHTML = data.map(project => `
        <article class="glass-panel project-card" style="overflow: hidden; display: flex; flex-direction: column; height: 100%;">
            <div style="height: 200px; overflow: hidden; position: relative;">
                ${!config.showLinkButton ? `<a href="${project.link}" target="_blank" style="display:block; height:100%;">` : ''}
                <img src="${project.image}" alt="${project.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); pointer-events: none;"></div>
                ${!config.showLinkButton ? `</a>` : ''}
            </div>
            
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">${project.title}</h3>
                
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
                
                ${config.showLinkButton ? `
                <a href="${project.link}" target="_blank" class="btn" style="background: rgba(255,255,255,0.05); justify-content: center; width: 100%; margin-top: auto; border: 1px solid var(--card-border);">
                    View Code
                </a>
                ` : ''}
            </div>
        </article>
    `).join('');

  // Add hover effect logic
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const img = card.querySelector('img');
      if (img) img.style.transform = 'scale(1.1)';
    });
    card.addEventListener('mouseleave', () => {
      const img = card.querySelector('img');
      if (img) img.style.transform = 'scale(1)';
    });
  });
};

const setupScrollReveal = () => {
  // Simple intersection observer for fade-in
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });
};

init();
