/**
 * Clase que representa una pista de carreras
 */
class Track {
    /**
     * Inicializa una nueva pista
     * @param {Object} options - Opciones de configuración
     * @param {string} options.name - Nombre de la pista ('track1', 'track2', 'track3')
     * @param {number} options.width - Ancho del canvas
     * @param {number} options.height - Alto del canvas
     */
    constructor(options) {
        this.name = options.name || 'track1';
        this.width = options.width;
        this.height = options.height;
        this.image = new Image();
        this.loadImage();
        
        // Zonas de drift y puntuación
        this.driftZones = this.initializeDriftZones();
        
        // Límites de la pista
        this.boundaries = {
            top: 50,
            right: this.width - 50,
            bottom: this.height - 50,
            left: 50
        };
        
        // Posición inicial del coche
        this.startPosition = this.getStartPosition();
    }
    
    /**
     * Carga la imagen de la pista
     */
    loadImage() {
        this.image.src = `assets/tracks/${this.name}.png`;
        this.image.onerror = () => {
            console.warn(`No se pudo cargar la pista ${this.name}, usando respaldo`);
            this.image = null;
        };
    }
    
    /**
     * Inicializa las zonas de drift según la pista seleccionada
     * @returns {Array} Array de zonas de drift
     */
    initializeDriftZones() {
        // Zonas predefinidas según el tipo de pista
        const zones = {
            'track1': [
                { x: 100, y: 200, width: 200, height: 100, multiplier: 1 },
                { x: 400, y: 300, width: 200, height: 100, multiplier: 1.5 },
                { x: 150, y: 500, width: 300, height: 100, multiplier: 2 }
            ],
            'track2': [
                { x: 150, y: 150, width: 250, height: 100, multiplier: 1.2 },
                { x: 500, y: 250, width: 200, height: 150, multiplier: 1.8 },
                { x: 200, y: 450, width: 350, height: 120, multiplier: 2.2 }
            ],
            'track3': [
                { x: 50, y: 100, width: 300, height: 150, multiplier: 1.5 },
                { x: 450, y: 200, width: 250, height: 200, multiplier: 2 },
                { x: 100, y: 500, width: 400, height: 150, multiplier: 2.5 }
            ]
        };
        
        // Devolver las zonas correspondientes o un array vacío si no hay definición
        return zones[this.name] || [];
    }
    
    /**
     * Obtiene la posición inicial del coche según la pista
     * @returns {Object} Posición inicial {x, y, angle}
     */
    getStartPosition() {
        // Posiciones predefinidas según la pista
        const positions = {
            'track1': { x: this.width / 2, y: this.height - 100, angle: 0 },
            'track2': { x: 100, y: this.height / 2, angle: Math.PI / 2 },
            'track3': { x: this.width - 100, y: 100, angle: Math.PI }
        };
        
        return positions[this.name] || { x: this.width / 2, y: this.height - 100, angle: 0 };
    }
    
    /**
     * Comprueba si un punto está dentro de una zona de drift
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {Object|null} Zona de drift o null si no está en ninguna
     */
    checkDriftZone(x, y) {
        for (const zone of this.driftZones) {
            if (x > zone.x && x < zone.x + zone.width &&
                y > zone.y && y < zone.y + zone.height) {
                return zone;
            }
        }
        return null;
    }
    
    /**
     * Dibuja la pista en el canvas
     * @param {CanvasRenderingContext2D} ctx - Contexto de canvas
     */
    draw(ctx) {
        // Dibujar fondo/base de la pista
        if (this.image && this.image.complete) {
            // Dibujar la imagen de la pista si está disponible
            ctx.drawImage(this.image, 0, 0, this.width, this.height);
        } else {
            // Respaldo si la imagen no está disponible
            ctx.fillStyle = '#555'; // Color gris para asfalto
            ctx.fillRect(0, 0, this.width, this.height);
            
            // Dibujar bordes
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 5;
            ctx.strokeRect(30, 30, this.width - 60, this.height - 60);
            
            // Dibujar líneas centrales
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.moveTo(this.width / 2, 0);
            ctx.lineTo(this.width / 2, this.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, this.height / 2);
            ctx.lineTo(this.width, this.height / 2);
            ctx.stroke();
            
            ctx.setLineDash([]);
        }
        
        // Dibujar zonas de drift (visibles para desarrollo, se pueden ocultar para la versión final)
        ctx.globalAlpha = 0.3;
        for (const zone of this.driftZones) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0 0.5)';
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            
            // Mostrar multiplicador
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(`x${zone.multiplier}`, zone.x + 10, zone.y + 25);
        }
        ctx.globalAlpha = 1.0;
    }
}