let currentVantagemIndex = 0;
const vantagens = document.querySelectorAll('.vantagens > div');
const INTERVALO = 2000; // 4 segundos por vantagem

function mostrarVantagem(index) {
    // Oculta todas as vantagens
    vantagens.forEach(v => {
        v.style.display = 'none';
        v.style.opacity = '0';
    });

    // Mostra apenas a vantagem atual
    if (vantagens[index]) {
        vantagens[index].style.display = 'flex';

        // Trigger reflow para ativar a animação
        vantagens[index].offsetHeight;

        vantagens[index].style.opacity = '1';
        vantagens[index].style.transition = 'opacity 0.6s ease-in-out';
    }
}

function proximaVantagem() {
    currentVantagemIndex = (currentVantagemIndex + 1) % vantagens.length;
    mostrarVantagem(currentVantagemIndex);
}

// Inicializa o carrossel
document.addEventListener('DOMContentLoaded', () => {
    mostrarVantagem(0);
    setInterval(proximaVantagem, INTERVALO);
});