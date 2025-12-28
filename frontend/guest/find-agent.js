//find-agent.js

const AGENT_API_BASE = '/public'

document.addEventListener('DOMContentLoaded', async () => {
	setUpAgentEventListeners();
});

function setUpAgentEventListeners() {
	const searchWrapper = document.querySelector('.hero-search-wrapper');
	const heroSection = document.querySelector('.hero-section');

	window.addEventListener('scroll', () => {
		const heroBottom = heroSection.getBoundingClientRect().bottom;
		
		if (heroBottom <= 80) {
			searchWrapper.classList.add('sticky');
		} else {
			searchWrapper.classList.remove('sticky');
		}
	});

	const heroSearchInput = document.querySelector('.hero-search-input');
	const defaultValue = 'Los Angeles, CA';

	document.querySelector('.hero-clear-btn').addEventListener('click', () => {
		heroSearchInput.value = '';
		heroSearchInput.focus();
	});

	heroSearchInput.addEventListener('blur', () => {
		if (heroSearchInput.value.trim() === '') {
			heroSearchInput.value = defaultValue;
		}
	});

	const heroSearchBtn = document.querySelector('.hero-search-btn');

	heroSearchBtn.addEventListener('click', () => {
		const searchValue = heroSearchInput.value.trim();
		
		if (searchValue) {
			window.location.href = `/frontend/guest/agents.html?search=${encodeURIComponent(searchValue)}`;
		} else {
			window.location.href = `/frontend/guest/agents.html`;
		}
	});

	heroSearchInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			heroSearchBtn.click();
		}
	});

    document.querySelectorAll('.sold-faq-question').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            
            header.classList.toggle('collapsed');
            if(content && content.classList.contains('sold-faq-answer')){
                content.classList.toggle('collapsed');
            }
        });
    });
}