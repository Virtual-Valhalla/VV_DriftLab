import logging
import json
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
import sqlite3
from concurrent.futures import ThreadPoolExecutor

# Configuración de logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# URL de tu Mini App (alojada en tu servidor)
MINI_APP_URL = "https://tu-servidor.com/drift-game"

# Conexión a la base de datos
def get_db_connection():
    conn = sqlite3.connect('drift_bot.db')
    conn.row_factory = sqlite3.Row
    return conn

# Inicializar la base de datos
def init_db():
    conn = get_db_connection()
    
    # Tabla de usuarios
    conn.execute('''
    CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        points INTEGER DEFAULT 0,
        tokens INTEGER DEFAULT 0,
        register_date TIMESTAMP,
        last_activity TIMESTAMP
    )
    ''')
    
    # Tabla de partidas
    conn.execute('''
    CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        score INTEGER,
        timestamp TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (telegram_id)
    )
    ''')
    
    # Tabla de actividad diaria
    conn.execute('''
    CREATE TABLE IF NOT EXISTS daily_check (
        user_id INTEGER,
        check_date DATE,
        PRIMARY KEY (user_id, check_date),
        FOREIGN KEY (user_id) REFERENCES users (telegram_id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Comando /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    conn = get_db_connection()
    
    # Registrar usuario si es nuevo
    conn.execute(
        "INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name, register_date, last_activity) VALUES (?, ?, ?, ?, ?, ?)",
        (user.id, user.username, user.first_name, user.last_name, datetime.now(), datetime.now())
    )
    
    # Actualizar fecha de última actividad
    conn.execute(
        "UPDATE users SET last_activity = ? WHERE telegram_id = ?",
        (datetime.now(), user.id)
    )
    
    # Registrar actividad diaria
    today = datetime.now().date()
    conn.execute(
        "INSERT OR IGNORE INTO daily_check (user_id, check_date) VALUES (?, ?)",
        (user.id, today)
    )
    
    # Si es la primera vez en el día, dar tokens por conectarse
    cursor = conn.execute(
        "SELECT COUNT(*) FROM daily_check WHERE user_id = ? AND check_date = ?", 
        (user.id, today)
    )
    first_check_today = cursor.fetchone()[0] == 1
    
    if first_check_today:
        conn.execute(
            "UPDATE users SET tokens = tokens + 5 WHERE telegram_id = ?",
            (user.id,)
        )
        daily_bonus = "¡Has recibido 5 tokens por conectarte hoy! 🎁"
    else:
        daily_bonus = "Ya has reclamado tu bonus diario. ¡Vuelve mañana! ⏰"
    
    conn.commit()
    conn.close()
    
    # Crear teclado con botón para el juego
    keyboard = [
        [InlineKeyboardButton("🏎️ Jugar Drift Racing", web_app=WebAppInfo(url=MINI_APP_URL))],
        [InlineKeyboardButton("👤 Mi Perfil", callback_data="profile"),
         InlineKeyboardButton("🏆 Ranking", callback_data="ranking")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"¡Hola {user.first_name}! 👋\n\n"
        f"{daily_bonus}\n\n"
        "🏎️ ¡Demuestra tus habilidades en Drift Racing!\n"
        "💰 Gana tokens por tus puntuaciones y posición en el ranking.\n\n"
        "Usa los botones de abajo para navegar:",
        reply_markup=reply_markup
    )

# Comando /profile
async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    conn = get_db_connection()
    
    # Obtener datos del usuario
    user_data = conn.execute(
        "SELECT * FROM users WHERE telegram_id = ?", (user.id,)
    ).fetchone()
    
    if not user_data:
        await update.message.reply_text("No estás registrado. Usa /start para registrarte.")
        conn.close()
        return
    
    # Obtener posición en el ranking
    ranking_position = conn.execute(
        "SELECT COUNT(*) + 1 FROM users WHERE points > ?", 
        (user_data['points'],)
    ).fetchone()[0]
    
    # Obtener mejor puntuación
    best_score = conn.execute(
        "SELECT MAX(score) FROM game_sessions WHERE user_id = ?",
        (user.id,)
    ).fetchone()[0]
    
    if best_score is None:
        best_score = 0
    
    # Obtener días consecutivos
    consecutive_days = get_consecutive_days(conn, user.id)
    
    conn.close()
    
    # Crear teclado
    keyboard = [
        [InlineKeyboardButton("🏎️ Jugar Ahora", web_app=WebAppInfo(url=MINI_APP_URL))],
        [InlineKeyboardButton("🔙 Volver", callback_data="back_to_start")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"📊 PERFIL DE {user.first_name.upper()}\n\n"
        f"🏆 Posición en ranking: #{ranking_position}\n"
        f"⭐ Puntos acumulados: {user_data['points']}\n"
        f"🎮 Mejor puntuación: {best_score}\n"
        f"💰 Tokens disponibles: {user_data['tokens']}\n"
        f"🔥 Días consecutivos: {consecutive_days}\n\n"
        "¡Sigue jugando para subir en el ranking y ganar más tokens!",
        reply_markup=reply_markup
    )

# Función para calcular días consecutivos
def get_consecutive_days(conn, user_id):
    today = datetime.now().date()
    consecutive = 0
    
    # Comprobar hasta 30 días atrás
    for i in range(30):
        check_date = today - timedelta(days=i)
        cursor = conn.execute(
            "SELECT COUNT(*) FROM daily_check WHERE user_id = ? AND check_date = ?", 
            (user_id, check_date)
        )
        if cursor.fetchone()[0] == 0:
            break
        consecutive += 1
    
    return consecutive

# Comando /ranking
async def ranking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    conn = get_db_connection()
    
    # Obtener top 10 usuarios por puntos
    top_users = conn.execute(
        "SELECT username, first_name, points FROM users ORDER BY points DESC LIMIT 10"
    ).fetchall()
    
    conn.close()
    
    if not top_users:
        await update.message.reply_text("Aún no hay usuarios en el ranking.")
        return
    
    message = "🏆 TOP 10 JUGADORES 🏆\n\n"
    for i, user in enumerate(top_users, 1):
        username = user['username'] or user['first_name'] or "Usuario"
        message += f"{i}. {username} - {user['points']} pts\n"
    
    keyboard = [[InlineKeyboardButton("🔙 Volver", callback_data="back_to_start")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(message, reply_markup=reply_markup)

# Manejador de datos de la Mini App
async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    try:
        # Procesar datos recibidos del juego
        data_json = update.effective_message.web_app_data.data
        data = json.loads(data_json)
        
        if data.get('action') == 'game_completed':
            score = int(data.get('score', 0))
            await process_game_score(user.id, score)
            
            await update.message.reply_text(
                f"¡Has completado una partida con {score} puntos! 🎮\n"
                f"Tu puntuación ha sido registrada y tus tokens actualizados."
            )
    except Exception as e:
        logging.error(f"Error processing web_app_data: {e}")
        await update.message.reply_text("Ha ocurrido un error al procesar tu puntuación.")

# Procesar puntuación del juego
async def process_game_score(user_id, score):
    conn = get_db_connection()
    
    try:
        # Registrar la partida
        conn.execute(
            "INSERT INTO game_sessions (user_id, score, timestamp) VALUES (?, ?, ?)",
            (user_id, score, datetime.now())
        )
        
        # Actualizar puntos totales del usuario
        conn.execute(
            "UPDATE users SET points = points + ? WHERE telegram_id = ?",
            (score, user_id)
        )
        
        # Calcular tokens ganados (ejemplo: 1 token por cada 100 puntos)
        tokens_earned = score // 100
        if tokens_earned > 0:
            conn.execute(
                "UPDATE users SET tokens = tokens + ? WHERE telegram_id = ?",
                (tokens_earned, user_id)
            )
        
        conn.commit()
    except Exception as e:
        logging.error(f"Error en process_game_score: {e}")
        conn.rollback()
    finally:
        conn.close()

# Manejador de callbacks
async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "profile":
        await profile(update, context)
    elif query.data == "ranking":
        await ranking(update, context)
    elif query.data == "back_to_start":
        await start(update, context)

# Tarea programada para distribución de tokens (cada 24h)
async def distribute_daily_tokens(context: ContextTypes.DEFAULT_TYPE):
    conn = get_db_connection()
    
    try:
        # Obtener top 10 usuarios
        top_users = conn.execute(
            "SELECT telegram_id FROM users ORDER BY points DESC LIMIT 10"
        ).fetchall()
        
        # Distribuir tokens según posición
        for i, user in enumerate(top_users):
            # Ejemplo: 50 tokens para el 1º, 45 para el 2º, etc.
            tokens = 50 - (i * 5) 
            conn.execute(
                "UPDATE users SET tokens = tokens + ? WHERE telegram_id = ?",
                (tokens, user['telegram_id'])
            )
            
            # Enviar notificación (esto requeriría un bot en ejecución)
            try:
                await context.bot.send_message(
                    chat_id=user['telegram_id'],
                    text=f"¡Felicidades! Has recibido {tokens} tokens por estar en la posición #{i+1} del ranking diario. 🎉"
                )
            except Exception as e:
                logging.error(f"Error enviando notificación: {e}")
        
        conn.commit()
    except Exception as e:
        logging.error(f"Error en distribute_daily_tokens: {e}")
        conn.rollback()
    finally:
        conn.close()

# Función principal
def main():
    # Inicializar la base de datos
    init_db()
    
    # Crear la aplicación
    application = Application.builder().token("7857170939:AAEl9-jiSFdH4wnMFoAsPMTWTgRv_iaok0o").build()
    
    # Registrar manejadores
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("profile", profile))
    application.add_handler(CommandHandler("ranking", ranking))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Manejador para datos de la Mini App
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    
    # Programar tarea diaria para distribución de tokens
    job_queue = application.job_queue
    job_queue.run_daily(distribute_daily_tokens, time=datetime.time(hour=0, minute=0, second=0))
    
    # Iniciar el bot
    application.run_polling()

if __name__ == "__main__":
    main()
