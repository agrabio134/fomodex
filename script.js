// Copy Contract Address
function copyCA() {
    const input = document.getElementById('ca');
    const button = event.target.closest('button');
    
    navigator.clipboard.writeText(input.value).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    });
}

// Close Banner
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.querySelector('.top-banner');
    const closeBtn = document.querySelector('.close-banner');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            banner.style.display = 'none';
        });
    }

    // Prevent disabled buttons
    document.querySelectorAll('.btn-disabled, [data-tooltip]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.classList.contains('btn-disabled') || btn.hasAttribute('data-tooltip')) {
                e.preventDefault();
            }
        });
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Nav shadow on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        } else {
            nav.style.boxShadow = 'none';
        }
    });
});

console.log('%cPEPIQ X ElizaOS', 'font-size: 20px; font-weight: bold; color: #90EE90;');
console.log('%cAI-Powered Meme on Solana', 'font-size: 14px; color: #00FF00;');