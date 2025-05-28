/**
 * Clase principal que controla el juego
 */
class Game {
    /**
     * Inicializa el juego
     */
    constructor() {
        // Inicializar Telegram Mini App
        this.initTelegramApp();
        
        // Referencias a elementos DOM
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            pause: document.getElementById('pause-screen'),
            end: document.getElementById('end-screen')
        };
        
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurar canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Estado del juego
        this.gameState = 'start'; // 'start', 'playing', 'paused', 'ended'
        this.selectedCar = 'car1';
        this.selectedTrack = 'track1';
        this.gameTime = 60; // 60 segundos por defecto
        this.timeRemaining = this.gameTime;
        this.lastTimestamp = 0;
        
        // Controles
        this.controls = {
            isAccelerating: false,
            isBraking: false,
            isTurningLeft: false,
            isTurningRight: false
        };
        
        // Objetos del juego
        this.car = null;
        this.track = null;
        this.physics = new Physics();
        this.scoreboard = new Scoreboard();
        
        // Temporizadores
        this.gameTimer = null;
        this.animationFrame = null;
        
        // Inicializar controladores de eventos
        this.initEventListeners();
    }
    
    /**
     * Inicializa la Telegram Mini App
     */
    initTelegramApp() {
        try {
            this.tgApp = window.Telegram.WebApp;
            if (this.tgApp) {
                this.tgApp.expand();
                
                // Al cerrar la app, enviar puntuación si el juego terminó
                this.tgApp.onEvent('viewportChanged', () => {
                    if (this.gameState === 'ended' && !this.tgApp.isExpanded) {
                        this.sendScore();
                    }
                });
            }
        } catch (e) {
            console.error("Error inicializando Telegram WebApp:", e);
            // Fallback para pruebas en navegador
            this.tgApp = {
                sendData: function(data) {
                    console.log("Datos enviados a Telegram:", data);
                    alert("Puntuación enviada: " + data);
                },
                showPopup: function(options) {
                    alert(options.message || "Game finished!");
                },
                isExpanded: true,
                onEvent: function() {}
            };
        }
    }
    
    /**
     * Ajusta el tamaño del canvas al tamaño de la ventana
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Si ya existe una pista, ajustar sus dimensiones
        if (this.track) {
            this.track.width = this.canvas.width;
            this.track.height = this.canvas.height;
        }
    }
    
    /**
     * Inicializa los controladores de eventos
     */
    initEventListeners() {
        // Botones de la pantalla de inicio
        document.querySelectorAll('.car-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Desseleccionar todos los coches
                document.querySelectorAll('.car-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Seleccionar el coche clickeado
                e.currentTarget.classList.add('selected');
                this.selectedCar = e.currentTarget.dataset.car;
            });
        });
        
        document.querySelectorAll('.track-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Desseleccionar todas las pistas
                document.querySelectorAll('.track-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Seleccionar la pista clickeada
                e.currentTarget.classList.add('selected');
                this.selectedTrack = e.currentTarget.dataset.track;
            });
        });
        
        // Botón de inicio
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Controles táctiles
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const accelBtn = document.getElementById('accel-btn');
        const brakeBtn = document.getElementById('brake-btn');
        
        // Event listeners para controles táctiles
        leftBtn.addEventListener('touchstart', () => { this.controls.isTurningLeft = true; });
        leftBtn.addEventListener('touchend', () => { this.controls.isTurningLeft = false; });
        
        rightBtn.addEventListener('touchstart', () => { this.controls.isTurningRight = true; });
        rightBtn.addEventListener('touchend', () => { this.controls.isTurningRight = false; });
        
        accelBtn.addEventListener('touchstart', () => { this.controls.isAccelerating = true; });
        accelBtn.addEventListener('touchend', () => { this.controls.isAccelerating = false; });
        
        brakeBtn.addEventListener('touchstart', () => { this.controls.isBraking = true; });
        brakeBtn.addEventListener('touchend', () => { this.controls.isBraking = false; });
        
        // Soporte para teclado (útil para pruebas en desktop)
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowUp': this.controls.isAccelerating = true; break;
                case 'ArrowDown': this.controls.isBraking = true; break;
                case 'ArrowLeft': this.controls.isTurningLeft = true; break;
                case 'ArrowRight': this.controls.isTurningRight = true; break;
                case 'Escape': this.togglePause(); break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'ArrowUp': this.controls.isAccelerating = false; break;
                case 'ArrowDown': this.controls.isBraking = false; break;
                case 'ArrowLeft': this.controls.isTurningLeft = false; break;
                case 'ArrowRight': this.controls.isTurningRight = false; break;
            }
        });
        
        // Botón de pausa
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });
        
        // Botones en pantalla de pausa
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('exit-btn').addEventListener('click', () => {
            this.exitGame();
        });
        
        // Botones en pantalla de fin de juego
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('submit-score-btn').addEventListener('click', () => {
            this.sendScore();
        });
    }
    
    /**
     * Inicia el juego
     */
    startGame() {
        // Cambiar estado del juego
        this.gameState = 'playing';
        
        // Mostrar pantalla de juego y ocultar las demás
        this.showScreen('game');
        
        // Crear objetos del juego
        this.track = new Track({
            name: this.selectedTrack,
            width: this.canvas.width,
            height: this.canvas.height
        });
        
        // Posición inicial basada en la pista
        const startPos = this.track.getStartPosition();
        
        this.car = new Car({
            type: this.selectedCar,
            x: startPos.x,
            y: startPos.y,
            angle: startPos.angle
        });
        
        // Reiniciar puntuación
        this.scoreboard.reset();
        
        // Reiniciar tiempo
        this.timeRemaining = this.gameTime;
        document.getElementById('time-display').textContent = `${this.timeRemaining}s`;
        
        // Iniciar temporizador del juego
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('time-display').textContent = `${this.timeRemaining}s`;
            
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
        
        // Iniciar bucle del juego
        this.lastTimestamp = performance.now();
        this.gameLoop(this.lastTimestamp);
    }
    
    /**
     * Bucle principal del juego
     * @param {number} timestamp - Marca de tiempo actual
     */
    gameLoop(timestamp) {
        // Calcular delta time para movimientos suaves
        const deltaTime = (timestamp - this.lastTimestamp) / 1000; // en segundos
        this.lastTimestamp = timestamp;
        
        // Solo actualizar si el juego está activo
        if (this.gameState === 'playing') {
            this.update(deltaTime);
            this.draw();
            
            // Continuar bucle
            this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
    
    /**
     * Actualiza los elementos del juego
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame en segundos
     */
    update(deltaTime) {
        // Actualizar el coche
        this.car.update(this.controls, this.track);
        
        // Verificar si el coche está en una zona de drift
        if (this.car.drifting) {
            const zone = this.track.checkDriftZone(this.car.x, this.car.y);
            if (zone) {
                // Añadir puntos por drift en zona especial
                this.scoreboard.addDriftPoints(1, zone.multiplier, this.car.speed / this.car.maxSpeed);
            } else {
                // Drift fuera de zona vale menos puntos
                this.scoreboard.addDriftPoints(0.5, 1, this.car.speed / this.car.maxSpeed);
            }
        }
    }
    
    /**
     * Dibuja los elementos del juego
     */
    draw() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar pista
        this.track.draw(this.ctx);
        
        // Dibujar coche
        this.car.draw(this.ctx);
        
        // Dibujar efectos adicionales
        this.drawEffects();
    }
    
    /**
     * Dibuja efectos visuales adicionales
     */
    drawEffects() {
        // Indicador de drift
        if (this.car.drifting) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('¡DRIFT!', 20, 30);
            
            // Efecto visual adicional para drift
            const zone = this.track.checkDriftZone(this.car.x, this.car.y);
            if (zone) {
                // Efecto visual para drift en zona especial
                this.ctx.beginPath();
                this.ctx.arc(this.car.x, this.car.y, 50, 0, 2 * Math.PI);
                this.ctx.strokeStyle = '#ffcc00';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        }
        
        // Mostrar velocidad
        const speedPercentage = Math.abs(this.car.speed / this.car.maxSpeed) * 100;
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`${Math.floor(speedPercentage)}%`, 20, this.canvas.height - 20);
        
        // Velocímetro visual
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(20, this.canvas.height - 40, 100, 10);
        
        const speedBarWidth = Math.abs(this.car.speed / this.car.maxSpeed) * 100;
        this.ctx.fillStyle = this.car.drifting ? '#ff5500' : '#3388ff';
        this.ctx.fillRect(20, this.canvas.height - 40, speedBarWidth, 10);
    }
    
    /**
     * Cambia entre juego en pausa y en ejecución
     */
    togglePause() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    /**
     * Pausa el juego
     */
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        this.showScreen('pause');
        
        // Pausar temporizador
        clearInterval(this.gameTimer);
        
        // Cancelar animación
        cancelAnimationFrame(this.animationFrame);
    }
    
    /**
     * Reanuda el juego desde pausa
     */
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'playing';
        this.showScreen('game');
        
        // Reiniciar temporizador
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('time-display').textContent = `${this.timeRemaining}s`;
            
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
        
        // Reiniciar bucle del juego
        this.lastTimestamp = performance.now();
        this.gameLoop(this.lastTimestamp);
    }
    
    /**
     * Reinicia el juego desde cero
     */
    restartGame() {
        // Limpiar temporizadores
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Volver a la pantalla de inicio
        this.gameState = 'start';
        this.showScreen('start');
        
        // Reiniciar objetos
        this.car = null;
        this.track = null;
        this.scoreboard.reset();
    }
    
    /**
     * Finaliza el juego
     */
    endGame() {
        // Cambiar estado
        this.gameState = 'ended';
        
        // Limpiar temporizadores
        clearInterval(this.gameTimer);
        cancelAnimationFrame(this.animationFrame);
        
        // Finalizar puntuación
        const results = this.scoreboard.finalizeGame();
        
        // Mostrar pantalla de fin
        this.showScreen('end');
        
        // Reproducir efecto de confeti (opcional)
        this.showEndGameEffects();
    }
    
    /**
     * Efectos visuales para el fin del juego
     */
    showEndGameEffects() {
        // Aquí podrías añadir un efecto visual como confeti
        // Este es un ejemplo simple
        const endScreen = this.screens.end;
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = -10 + 'px';
            confetti.style.backgroundColor = ['#ff5500', '#3388ff', '#ffcc00', '#33cc33'][Math.floor(Math.random() * 4)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.opacity = Math.random();
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            endScreen.appendChild(confetti);
            
            // Animar confeti
            setTimeout(() => {
                confetti.style.transition = 'all 2s ease-out';
                confetti.style.top = Math.random() * 80 + 20 + '%';
                confetti.style.opacity = '0';
                
                // Eliminar después de animación
                setTimeout(() => {
                    confetti.remove();
                }, 2000);
            }, Math.random() * 500);
        }
    }
    
    /**
     * Sale del juego y vuelve al bot
     */
    exitGame() {
        try {
            // Si estamos en Telegram, cerrar la Mini App
            if (this.tgApp && typeof this.tgApp.close === 'function') {
                this.tgApp.close();
            } else {
                // Si no, volver a la pantalla de inicio
                this.restartGame();
            }
        } catch (e) {
            console.error("Error al salir del juego:", e);
            this.restartGame();
        }
    }
    
    /**
     * Envía la puntuación al bot de Telegram
     */
    sendScore() {
        try {
            const score = this.scoreboard.getScore();
            const tokensEarned = this.scoreboard.getTokensEarned();
            
            // Enviar datos al bot
            this.tgApp.sendData(JSON.stringify({
                action: 'game_completed',
                score: score,
                tokensEarned: tokensEarned
            }));
            
            // Mostrar confirmación
            this.tgApp.showPopup({
                title: '¡Puntuación enviada!',
                message: `Has conseguido ${score} puntos y ${tokensEarned} tokens.`,
                buttons: [{type: 'ok'}]
            });
        } catch (e) {
            console.error("Error enviando puntuación:", e);
            alert(`Error al enviar puntuación: ${e.message}`);
        }
    }
    
    /**
     * Muestra una pantalla y oculta las demás
     * @param {string} screenId - ID de la pantalla a mostrar
     */
    showScreen(screenId) {
        // Ocultar todas las pantallas
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Mostrar la pantalla solicitada
        this.screens[screenId].classList.remove('hidden');
    }
    
    /**
     * Carga las imágenes necesarias de manera asíncrona
     * @returns {Promise} - Promesa que se resuelve cuando todas las imágenes están cargadas
     */
    preloadImages() {
        return new Promise((resolve) => {
            const imagesToLoad = [
                `assets/cars/car1.png`,
                `assets/cars/car2.png`,
                `assets/cars/car3.png`,
                `assets/tracks/track1.png`,
                `assets/tracks/track2.png`,
                `assets/tracks/track3.png`
            ];
            
            let loadedImages = 0;
            const totalImages = imagesToLoad.length;
            
            // Si no hay imágenes, resolver inmediatamente
            if (totalImages === 0) {
                resolve();
                return;
            }
            
            // Función para manejar la carga de cada imagen
            const imageLoaded = () => {
                loadedImages++;
                if (loadedImages === totalImages) {
                    resolve();
                }
            };
            
            // Cargar todas las imágenes
            imagesToLoad.forEach(src => {
                const img = new Image();
                img.onload = imageLoaded;
                img.onerror = imageLoaded; // Contar como cargada incluso si falla
                img.src = src;
            });
            
            // Resolver después de un tiempo máximo para evitar bloqueos
            setTimeout(resolve, 5000);
        });
    }
    
    /**
     * Verifica si el dispositivo es móvil
     * @returns {boolean} - true si es un dispositivo móvil
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Maneja la orientación del dispositivo
     */
    handleOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (this.isMobileDevice() && !isLandscape) {
            // Mostrar mensaje para rotar el dispositivo
            if (!this.orientationMessage) {
                this.orientationMessage = document.createElement('div');
                this.orientationMessage.className = 'orientation-message';
                this.orientationMessage.innerHTML = `
                    <div class="message-content">
                        <div class="rotate-icon">↻</div>
                        <p>Para una mejor experiencia, gira tu dispositivo</p>
                    </div>
                `;
                document.body.appendChild(this.orientationMessage);
            } else {
                this.orientationMessage.style.display = 'flex';
            }
        } else if (this.orientationMessage) {
            // Ocultar mensaje
            this.orientationMessage.style.display = 'none';
        }
    }
}

// Iniciar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para asegurar que todo esté cargado
    setTimeout(() => {
        const game = new Game();
        
        // Manejar cambios de orientación
        window.addEventListener('resize', () => {
            game.handleOrientation();
        });
        game.handleOrientation();
        
        // Precargar imágenes
        game.preloadImages().then(() => {
            console.log("Imágenes precargadas correctamente");
        });
    }, 500);
});
