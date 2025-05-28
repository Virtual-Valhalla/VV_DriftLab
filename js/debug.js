// Archivo de depuración para identificar problemas
console.log("Debug script loaded");

// Verificar si los scripts principales se cargan
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded");
    
    // Verificar si las clases principales están definidas
    console.log("Physics defined:", typeof Physics !== 'undefined');
    console.log("Car defined:", typeof Car !== 'undefined');
    console.log("Track defined:", typeof Track !== 'undefined');
    console.log("Scoreboard defined:", typeof Scoreboard !== 'undefined');
    console.log("Game defined:", typeof Game !== 'undefined');
    
    // Comprobar si las imágenes están disponibles
    function checkImage(url) {
        const img = new Image();
        img.onload = () => console.log(`Image loaded: ${url}`);
        img.onerror = () => console.log(`Image failed: ${url}`);
        img.src = url;
    }
    
    // Verificar algunas imágenes críticas
    checkImage('assets/cars/car1.png');
    checkImage('assets/cars/car2.png');
    checkImage('assets/tracks/track1.png');
    
    // Intentar iniciar el juego manualmente si hay problemas
    setTimeout(() => {
        console.log("Attempting manual game initialization");
        try {
            window.gameInstance = new Game();
            console.log("Game instance created:", window.gameInstance);
        } catch (e) {
            console.error("Failed to create game instance:", e);
        }
    }, 2000);
});

// Añadir un monitor global de errores
window.onerror = function(msg, url, line, col, error) {
    console.log(`Error: ${msg} at ${url}:${line}:${col}`);
    return false;
};
