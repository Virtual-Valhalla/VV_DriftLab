/**
 * Clase que representa el coche del jugador
 */
class Car {
    /**
     * Inicializa un nuevo coche
     * @param {Object} options - Opciones de configuración
     * @param {string} options.type - Tipo de coche ('car1', 'car2', 'car3')
     * @param {number} options.x - Posición inicial X
     * @param {number} options.y - Posición inicial Y
     * @param {number} options.angle - Ángulo inicial
     */
    constructor(options) {
        this.type = options.type || 'car1';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = 40;  // Ancho del coche
        this.height = 70; // Largo del coche
        this.angle = options.angle || 0;
        this.speed = 0;
        this.acceleration = 0.25;
        this.maxSpeed = 7;
        this.friction = 0.95;
        this.angularVelocity = 0;
        this.maxAngularVelocity = 0.08;
        this.drifting = false;
        this.driftFactor = 1.0;
        this.driftThreshold = 0.03;
        this.skidmarks = [];
        this.lastSkidmarkTime = 0;
        this.skidmarkInterval = 5; // Intervalo para añadir marcas de derrape
        this.image = new Image();
        this.loadImage();
        
        // Propiedades avanzadas para conducción
        this.grip = 0.95;       // Agarre del coche (1 = perfecto, 0 = sin agarre)
        this.driftAngle = 0;    // Ángulo de derrape
        this.handling = 1.2;    // Capacidad de giro
        this.driftRecovery = 0.05; // Velocidad de recuperación tras un drift
    }
    
    /**
     * Carga la imagen del coche según el tipo
     */
    loadImage() {
        this.image.src = `assets/cars/${this.type}.png`;
        // Imagen de respaldo por si falla la carga
        this.image.onerror = () => {
            console.warn(`No se pudo cargar la imagen para ${this.type}, usando respaldo`);
            this.image = null;
        };
    }
    
    /**
     * Actualiza el estado del coche
     * @param {Object} controls - Estado de los controles
     * @param {boolean} controls.isAccelerating - ¿Está acelerando?
     * @param {boolean} controls.isBraking - ¿Está frenando?
     * @param {boolean} controls.isTurningLeft - ¿Está girando a la izquierda?
     * @param {boolean} controls.isTurningRight - ¿Está girando a la derecha?
     * @param {Object} track - Información de la pista
     */
    update(controls, track) {
        // Actualizar velocidad según controles
        if (controls.isAccelerating) {
            this.speed += this.acceleration;
        }
        if (controls.isBraking) {
            this.speed -= this.acceleration * 1.5;
        }
        
        // Limitar velocidad
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
        
        // Aplicar fricción
        this.speed *= this.friction;
        
        // Calcular factor de giro basado en velocidad
        // Más eficaz a velocidad media, más difícil a velocidad alta
        const turnFactor = this.handling * Math.min(1, Math.abs(this.speed) / 4);
        
        // Actualizar giro según controles
        if (controls.isTurningLeft) this.angularVelocity -= 0.004 * turnFactor;
        if (controls.isTurningRight) this.angularVelocity += 0.004 * turnFactor;
        
        // Limitar velocidad angular
        if (this.angularVelocity > this.maxAngularVelocity) 
            this.angularVelocity = this.maxAngularVelocity;
        if (this.angularVelocity < -this.maxAngularVelocity) 
            this.angularVelocity = -this.maxAngularVelocity;
        
        // Actualizar ángulo y aplicar fricción a velocidad angular
        this.angle += this.angularVelocity;
        this.angularVelocity *= 0.9;
        
        // Detectar si está haciendo drift
        const absAngularVel = Math.abs(this.angularVelocity);
        const absSpeed = Math.abs(this.speed);
        
        this.drifting = (absAngularVel > this.driftThreshold) && (absSpeed > 4);
        
        // Aplicar físicas de drift
        if (this.drifting) {
            // Aumentar ángulo de derrape
            this.driftAngle += this.angularVelocity * 0.2;
            // Limitar ángulo de derrape
            const maxDriftAngle = 0.3;
            if (this.driftAngle > maxDriftAngle) this.driftAngle = maxDriftAngle;
            if (this.driftAngle < -maxDriftAngle) this.driftAngle = -maxDriftAngle;
            
            // Añadir marcas de derrape
            const now = Date.now();
            if (now - this.lastSkidmarkTime > this.skidmarkInterval) {
                this.addSkidmark();
                this.lastSkidmarkTime = now;
            }
        } else {
            // Recuperar de drift
            if (this.driftAngle > 0) {
                this.driftAngle -= this.driftRecovery;
                if (this.driftAngle < 0) this.driftAngle = 0;
            } else if (this.driftAngle < 0) {
                this.driftAngle += this.driftRecovery;
                if (this.driftAngle > 0) this.driftAngle = 0;
            }
        }
        
        // Calcular dirección de movimiento considerando derrape
        const moveAngle = this.angle + this.driftAngle;
        
        // Actualizar posición según velocidad y ángulo
        this.x += Math.sin(moveAngle) * this.speed;
        this.y -= Math.cos(moveAngle) * this.speed;
        
        // Desvanecer marcas de derrape
        this.updateSkidmarks();
        
        // Colisiones con límites de la pista (si están definidos)
        if (track && track.boundaries) {
            this.handleTrackCollisions(track);
        }
    }
    
    /**
     * Maneja colisiones con los límites de la pista
     */
    handleTrackCollisions(track) {
        // Implementación básica - será expandida en track.js
        const boundaries = track.boundaries;
        if (this.x < boundaries.left) this.x = boundaries.left;
        if (this.x > boundaries.right) this.x = boundaries.right;
        if (this.y < boundaries.top) this.y = boundaries.top;
        if (this.y > boundaries.bottom) this.y = boundaries.bottom;
    }
    
    /**
     * Añade una marca de derrape en la posición actual
     */
    addSkidmark() {
        // Calcula la posición de las ruedas traseras
        const rearWheelDistance = this.height / 3;
        const leftWheelOffset = this.width / 3;
        
        // Añadir marcas para ambas ruedas traseras
        for (let side = -1; side <= 1; side += 2) {
            const wheelX = this.x - Math.sin(this.angle) * rearWheelDistance + 
                          Math.cos(this.angle) * leftWheelOffset * side;
            const wheelY = this.y + Math.cos(this.angle) * rearWheelDistance + 
                          Math.sin(this.angle) * leftWheelOffset * side;
            
            this.skidmarks.push({
                x: wheelX,
                y: wheelY,
                angle: this.angle,
                alpha: 1.0,
                width: 5,
                length: 10
            });
        }
        
        // Limitar el número de marcas para rendimiento
        if (this.skidmarks.length > 100) {
            this.skidmarks.splice(0, this.skidmarks.length - 100);
        }
    }
    
    /**
     * Actualiza y desvanece las marcas de derrape
     */
    updateSkidmarks() {
        for (let i = this.skidmarks.length - 1; i >= 0; i--) {
            this.skidmarks[i].alpha -= 0.01;
            if (this.skidmarks[i].alpha <= 0) {
                this.skidmarks.splice(i, 1);
            }
        }
    }
    
    /**
     * Dibuja el coche y sus efectos en el canvas
     * @param {CanvasRenderingContext2D} ctx - Contexto de canvas
     */
    draw(ctx) {
        // Dibujar marcas de derrape
        for (const mark of this.skidmarks) {
            ctx.save();
            ctx.translate(mark.x, mark.y);
            ctx.rotate(mark.angle);
            ctx.fillStyle = `rgba(0, 0, 0, ${mark.alpha})`;
            ctx.fillRect(-mark.width/2, -mark.length/2, mark.width, mark.length);
            ctx.restore();
        }
        
        // Dibujar el coche
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.image && this.image.complete) {
            // Dibujar imagen del coche si está disponible
            ctx.drawImage(
                this.image, 
                -this.width/2, 
                -this.height/2, 
                this.width, 
                this.height
            );
        } else {
            // Respaldo si la imagen no está disponible
            ctx.fillStyle = this.drifting ? '#ff5500' : '#3388ff';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // Detalles del coche
            ctx.fillStyle = '#000';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, 10); // frente
            ctx.fillRect(-this.width/2, this.height/2 - 10, this.width, 10); // parte trasera
        }
        
        // Efecto visual para el drift
        if (this.drifting) {
            ctx.globalAlpha = 0.7;
            ctx.rotate(this.driftAngle);
            ctx.fillStyle = 'rgba(255, 85, 0, 0.3)';
            ctx.fillRect(-this.width/2 - 5, -this.height/2 - 5, this.width + 10, this.height + 10);
        }
        
        ctx.restore();
    }
}