"""
Конфигурационный файл для чтения настроек из .env
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / '.env'

# Загружаем .env файл
load_dotenv(ENV_PATH)

# DeepL настройки
DEEPL_API_KEY = os.getenv('DEEPL_API_KEY', '')
DEEPL_API_KEY_ALT = os.getenv('DEEPL_API_KEY_ALT', '')  # Альтернативный ключ если нужен

# Aspose настройки
ASPOSE_LICENSE_PATH = os.getenv('ASPOSE_LICENSE_PATH', 'Aspose.Words.lic')

# Настройки перевода
MAX_CONCURRENT_TRANSLATIONS = int(os.getenv('MAX_CONCURRENT_TRANSLATIONS', '2'))

# Пути
OUTPUT_DIR = os.getenv('OUTPUT_DIR', './out')
TEMP_DIR = os.getenv('TEMP_DIR', './temp')

# Проверка наличия ключа
def check_deepl_key():
    """Проверяет, установлен ли DeepL API ключ"""
    if not DEEPL_API_KEY:
        raise ValueError(
            "DeepL API ключ не найден! "
            "Пожалуйста, установите DEEPL_API_KEY в файле .env"
        )
    return True

# Дополнительные настройки
SUPPORTED_EXTENSIONS = ['.docx', '.pdf']
TRANSLATION_SUFFIX = "_to_{target_lang_code}"

# Языковые настройки
LANGUAGE_OPTIONS = {
    "1": {"name": "Русский -> Английский (US)", "source": "RU", "target": "EN-US"},
    "2": {"name": "Английский -> Русский", "source": "EN", "target": "RU"},
    "3 Translate_politics": {"name": "Немецкий -> Русский", "source": "DE", "target": "RU"},
}