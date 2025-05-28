/**
 * Clase que maneja la física del juego
 */
class Physics {
    /**
     * Inicializa el motor de física
     */
    constructor() {
        // Constantes físicas
        this.GRAVITY = 9.8; // m/s²
        this.AIR_DENSITY = 1.2; // kg/m³
        
        // Factores de ajuste para la experiencia de juego
        this.DRIFT_FACTOR = 1.2;  // Factor que afecta cuán fácil es derrapar
        this.GRIP_RECOVERY = 0.06; // Cuán rápido se recupera el agarre después de un drift
    }
    
    /**
     * Calcula el efecto de derrape basado en la velocidad y giro
     * @param {number} speed - Velocidad actual
     * @param {number} angularVelocity - Velocidad angular
     * @param {number} grip - Agarre del vehículo (0-1)
     * @returns {Object} - Información de derrape {isDrifting, driftAngle, driftIntensity}
     */
    calculateDrift(speed, angularVelocity, grip) {
        // Umbral para iniciar un derrape
        const DRIFT_THRESHOLD = 0.03 / grip;
        
        // Intensidad del derrape basada en velocidad y giro
        const absSpeed = Math.abs(speed);
        const absAngularVel = Math.abs(angularVelocity);
        
        // Solo se derrapa a velocidad suficiente y giro brusco
        const isDrifting = (absAngularVel > DRIFT_THRESHOLD) && (absSpeed > 4);
        
        // Calcular ángulo de derrape
        let driftAngle = 0;
        let driftIntensity = 0;
        
        if (isDrifting) {
            // El ángulo de derrape es proporcional a la velocidad angular
            // pero inversamente proporcional al agarre
            driftAngle = (angularVelocity * absSpeed * this.DRIFT_FACTOR) / (grip * 10);
            
            // Limitar el ángulo máximo de derrape
            const maxDriftAngle = 0.4;
            if (driftAngle > maxDriftAngle) driftAngle = maxDriftAngle;
            if (driftAngle < -maxDriftAngle) driftAngle = -maxDriftAngle;
            
            // Intensidad del derrape (para efectos visuales y puntuación)
            driftIntensity = (absAngularVel * absSpeed) / 2;
        }
        
        return {
            isDrifting,
            driftAngle,
            driftIntensity
        };
    }
    
    /**
     * Aplica fricción basada en la superficie
     * @param {number} speed - Velocidad actual
     * @param {string} surface - Tipo de superficie ('asphalt', 'dirt', 'grass', 'sand')
     * @returns {number} - Velocidad después de aplicar fricción
     */
    applyFriction(speed, surface = 'asphalt') {
        const frictionFactors = {
            'asphalt': 0.97,
            'dirt': 0.94,
            'grass': 0.92,
            'sand': 0.88
        };
        
        const factor = frictionFactors[surface] || frictionFactors.asphalt;
        return speed * factor;
    }
    
    /**
     * Detecta colisiones entre dos objetos rectangulares
     * @param {Object} rect1 - Primer rectángulo {x, y, width, height, angle}
     * @param {Object} rect2 - Segundo rectángulo {x, y, width, height, angle}
     * @returns {boolean} - true si hay colisión
     */
    checkCollision(rect1, rect2) {
        // Implementación simple de colisión para desarrollo
        // Se puede mejorar con algoritmos más precisos para polígonos rotados
        
        // Convertir a círculos para una detección simple
        const radius1 = Math.max(rect1.width, rect1.height) / 2;
        const radius2 = Math.max(rect2.width, rect2.height) / 2;
        
        const dx = rect1.x - rect2.x;
        const dy = rect1.y - rect2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (radius1 + radius2);
    }
}