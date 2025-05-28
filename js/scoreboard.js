/**
 * Clase que maneja la puntuación y recompensas
 */
class Scoreboard {
    /**
     * Inicializa el sistema de puntuación
     */
    constructor() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimeout = null;
        this.maxCombo = 0;
        this.tokensEarned = 0;
        
        // Elementos del DOM para actualizar la UI
        this.scoreDisplay = document.getElementById('score-display');
        this.multiplierDisplay = document.getElementById('multiplier-display');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.tokensEarnedDisplay = document.getElementById('tokens-earned');
    }
    
    /**
     * Añade puntos por drift
     * @param {number} basePoints - Puntos base
     * @param {number} multiplierBonus - Multiplicador de bonificación (de la zona)
     * @param {number} intensity - Intensidad del drift (0-1)
     */
    addDriftPoints(basePoints, multiplierBonus = 1, intensity = 0.5) {
        // Reiniciar timeout del combo
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
        }
        
        // Aumentar combo y multiplicador
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        
        // El multiplicador aumenta cada 5 combos
        this.multiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        if (this.multiplier > 5) this.multiplier = 5; // Límite máximo
        
        // Aplicar bonificaciones
        const pointsToAdd = basePoints * this.multiplier * multiplierBonus * (1 + intensity);
        this.score += Math.round(pointsToAdd);
        
        // Actualizar la UI
        this.updateUI();
        
        // Establecer timeout para reiniciar el combo
        this.comboTimeout = setTimeout(() => {
            this.resetCombo();
        }, 2000); // 2 segundos sin puntuar reinicia el combo
    }
    
    /**
     * Reinicia el contador de combo
     */
    resetCombo() {
        this.combo = 0;
        this.multiplier = 1;
        this.updateUI();
    }
    
    /**
     * Actualiza los elementos de la interfaz
     */
    updateUI() {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Puntos: ${Math.floor(this.score)}`;
        }
        
        if (this.multiplierDisplay) {
            this.multiplierDisplay.textContent = `x${this.multiplier.toFixed(1)}`;
            
            // Efecto visual para el multiplicador
            if (this.multiplier > 1) {
                this.multiplierDisplay.style.color = '#ff5500';
                this.multiplierDisplay.style.fontSize = `${16 + (this.multiplier * 2)}px`;
            } else {
                this.multiplierDisplay.style.color = 'white';
                this.multiplierDisplay.style.fontSize = '16px';
            }
        }
    }
    
    /**
     * Finaliza la partida y calcula tokens ganados
     * @returns {Object} - Resultados {score, tokensEarned, maxCombo}
     */
    finalizeGame() {
        // Calcular tokens según puntuación (1 token por cada 100 puntos)
        this.tokensEarned = Math.floor(this.score / 100);
        
        // Bonus por combo máximo
        if (this.maxCombo >= 10) {
            this.tokensEarned += Math.floor(this.maxCombo / 10);
        }
        
        // Actualizar pantalla final
        if (this.finalScoreDisplay) {
            this.finalScoreDisplay.textContent = `Puntuación: ${Math.floor(this.score)}`;
        }
        
        if (this.tokensEarnedDisplay) {
            this.tokensEarnedDisplay.textContent = `Tokens ganados: ${this.tokensEarned}`;
        }
        
        return {
            score: Math.floor(this.score),
            tokensEarned: this.tokensEarned,
            maxCombo: this.maxCombo
        };
    }
    
    /**
     * Obtiene la puntuación actual
     * @returns {number} - Puntuación actual
     */
    getScore() {
        return Math.floor(this.score);
    }
    
    /**
     * Obtiene los tokens ganados
     * @returns {number} - Tokens ganados
     */
    getTokensEarned() {
        return this.tokensEarned;
    }
    
    /**
     * Reinicia el marcador para una nueva partida
     */
    reset() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.tokensEarned = 0;
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
        this.updateUI();
    }
}