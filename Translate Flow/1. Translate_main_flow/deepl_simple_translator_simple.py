#!/usr/bin/env python3
"""
Простой переводчик документов через DeepL API
Только базовые функции для качественного перевода научных статей
"""

import deepl
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Загрузка переменных окружения
# Ищем .env файл в корне проекта (три уровня вверх от текущего файла)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

# Конфигурация
# Попробуем сначала DEEPL_TEXT_API_KEY, затем DEEPL_API_KEY
DEEPL_API_KEY = os.getenv('DEEPL_TEXT_API_KEY', '')
if not DEEPL_API_KEY:
    DEEPL_API_KEY = os.getenv('DEEPL_API_KEY', '')
SUPPORTED_EXTENSIONS = ['.docx', '.pdf', '.html', '.htm']
TRANSLATION_SUFFIX = "_translated"
PAUSE_BETWEEN_REQUESTS = 0.5  # Пауза между запросами в секундах

# Проверка доступности python-docx
DOCX_AVAILABLE = False
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    pass

# Языковые опции
LANGUAGE_OPTIONS = {
    "1": {"name": "Русский -> Английский (US)", "source": "RU", "target": "EN-US"},
    "2": {"name": "Английский -> Русский", "source": "EN", "target": "RU"},
    "3": {"name": "Немецкий -> Русский", "source": "DE", "target": "RU"},
}


def check_api_key():
    """Проверка наличия API ключа"""
    if not DEEPL_API_KEY:
        print("Ошибка: Ключ DeepL API не найден.")
        print("Создайте файл .env и добавьте:")
        print("DEEPL_API_KEY=your_api_key_here")
        sys.exit(1)


def initialize_translator():
    """Инициализация переводчика"""
    print("\nИнициализация DeepL...")
    print(f"Используется ключ: {DEEPL_API_KEY[:8]}...")  # Показываем только начало ключа для безопасности
    
    # Пробуем разные варианты ключа
    keys_to_try = [DEEPL_API_KEY]
    
    # Если ключ не заканчивается на :fx, пробуем добавить
    if not DEEPL_API_KEY.endswith(':fx'):
        keys_to_try.append(DEEPL_API_KEY + ':fx')
    
    for key in keys_to_try:
        try:
            translator = deepl.Translator(key)
            
            # Проверка лимитов
            usage = translator.get_usage()
            if usage.character.count and usage.character.limit:
                remaining = usage.character.limit - usage.character.count
                print(f"Осталось символов: {remaining:,}")
                
                if remaining <= 0:
                    print("Ошибка: Лимит символов исчерпан!")
                    sys.exit(1)
            
            print("Инициализация успешна.\n")
            return translator
            
        except deepl.AuthorizationException:
            continue
        except Exception as e:
            print(f"Ошибка инициализации: {e}")
            continue
    
    # Если ни один ключ не подошел
    print("\nОшибка: Неверный API ключ.")
    print("Проверьте:")
    print("1. Ключ действителен и не истек")
    print("2. Для бесплатного API ключ должен заканчиваться на ':fx'")
    print("3. Для Pro API ключ НЕ должен заканчиваться на ':fx'")
    print("\nТекущий ключ:", DEEPL_API_KEY[:8] + "..." + DEEPL_API_KEY[-4:])
    sys.exit(1)


def get_language_choice():
    """Выбор направления перевода"""
    print("\nВыберите направление перевода:")
    for key, value in LANGUAGE_OPTIONS.items():
        print(f"  {key}: {value['name']}")
    
    while True:
        choice = input("\nВведите номер (1-3): ").strip()
        if choice in LANGUAGE_OPTIONS:
            lang = LANGUAGE_OPTIONS[choice]
            return lang['source'], lang['target']
        print("Неверный выбор. Попробуйте снова.")


def translate_single_file(translator, file_path, source_lang, target_lang):
    """Перевод одного файла"""
    output_path = file_path.with_name(
        f"{file_path.stem}{TRANSLATION_SUFFIX}_{target_lang.lower()}{file_path.suffix}"
    )
    
    print(f"\nПеревод: {file_path.name}")
    print(f"Направление: {source_lang} -> {target_lang}")
    
    # Проверка существования выходного файла
    if output_path.exists():
        overwrite = input(f"\nФайл {output_path.name} уже существует. Перезаписать? (y/n): ")
        if overwrite.lower() != 'y':
            print("Пропуск файла.")
            return False
    
    try:
        start_time = time.time()
        
        # Выполняем перевод
        # Для документов DeepL автоматически определяет контекст и стиль
        # formality поддерживается только для: DE, FR, IT, ES, NL, PL, PT, RU, JA
        translation_params = {
            "input_path": str(file_path),
            "output_path": str(output_path),
            "source_lang": source_lang,
            "target_lang": target_lang
        }
        
        # Добавляем formality только для поддерживаемых языков
        formality_supported_langs = ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'PT-PT', 'PT-BR', 'RU', 'JA']
        if target_lang in formality_supported_langs:
            translation_params["formality"] = "more"
        
        # Примечание: Для научных текстов на английский DeepL автоматически
        # использует формальный стиль на основе контекста документа
        
        translator.translate_document_from_filepath(**translation_params)
        
        elapsed = time.time() - start_time
        print(f"✓ Успешно переведен за {elapsed:.1f} сек.")
        print(f"  Сохранен как: {output_path.name}")
        
        # Постобработка для DOCX файлов (удаление скобок из индексов)
        if output_path.suffix.lower() == '.docx' and DOCX_AVAILABLE:
            # Применяем только для перевода RU->EN
            if source_lang == 'RU' and target_lang.startswith('EN'):
                print("  Постобработка DOCX доступна через отдельные скрипты")
                # remove_brackets_from_indices(output_path)  # Функция не определена
        
        # Пауза между запросами
        if PAUSE_BETWEEN_REQUESTS > 0:
            print(f"  Пауза {PAUSE_BETWEEN_REQUESTS} сек...")
            time.sleep(PAUSE_BETWEEN_REQUESTS)
        
        return True
        
    except deepl.DocumentTranslationException as e:
        print(f"✗ Ошибка перевода: {e}")
        return False
    except deepl.QuotaExceededException:
        print("✗ Превышена квота API")
        return False
    except Exception as e:
        print(f"✗ Непредвиденная ошибка: {e}")
        return False


def translate_single_file_to_path(translator, file_path, output_path, source_lang, target_lang):
    """Перевод одного файла с указанием пути вывода"""
    print(f"  Перевод: {file_path.name}")
    print(f"  Сохранить как: {output_path.name}")
    
    # Проверка существования выходного файла
    if output_path.exists():
        print("  Пропуск: файл уже существует")
        return False
    
    try:
        start_time = time.time()
        
        # Выполняем перевод
        translation_params = {
            "input_path": str(file_path),
            "output_path": str(output_path),
            "source_lang": source_lang,
            "target_lang": target_lang
        }
        
        # Добавляем formality только для поддерживаемых языков
        formality_supported_langs = ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'PT-PT', 'PT-BR', 'RU', 'JA']
        if target_lang in formality_supported_langs:
            translation_params["formality"] = "more"
        
        translator.translate_document_from_filepath(**translation_params)
        
        elapsed = time.time() - start_time
        print(f"  ✓ Успешно за {elapsed:.1f} сек.")
        
        # Постобработка для DOCX файлов (удаление скобок из индексов)
        if output_path.suffix.lower() == '.docx' and DOCX_AVAILABLE:
            # Применяем только для перевода RU->EN
            if source_lang == 'RU' and target_lang.startswith('EN'):
                print("  Постобработка DOCX доступна через отдельные скрипты")
                # remove_brackets_from_indices(output_path)  # Функция не определена
        
        # Пауза между запросами
        if PAUSE_BETWEEN_REQUESTS > 0:
            print(f"  Пауза {PAUSE_BETWEEN_REQUESTS} сек...")
            time.sleep(PAUSE_BETWEEN_REQUESTS)
        
        return True
        
    except deepl.DocumentTranslationException as e:
        print(f"  ✗ Ошибка перевода: {e}")
        return False
    except deepl.QuotaExceededException:
        print("  ✗ Превышена квота API")
        return False
    except Exception as e:
        print(f"  ✗ Непредвиденная ошибка: {e}")
        return False


def translate_folder(translator, folder_path, source_lang, target_lang):
    """Перевод всех файлов в папке с сохранением структуры"""
    # Создаем папку для переводов рядом с исходной
    output_folder = folder_path.parent / f"{folder_path.name}_translated"
    
    print(f"\nСоздаю папку для переводов: {output_folder}")
    try:
        output_folder.mkdir(exist_ok=True)
    except Exception as e:
        print(f"Ошибка при создании папки: {e}")
        return
    
    # Поиск файлов
    files_found = []
    for ext in SUPPORTED_EXTENSIONS:
        files_found.extend(folder_path.rglob(f"*{ext}"))
    
    # Фильтрация временных файлов и уже переведенных
    files_to_translate = []
    for f in files_found:
        if f.is_file() and not f.name.startswith('~$'):
            # Пропускаем файлы, которые уже содержат суффикс перевода
            if not any(suffix in f.stem for suffix in ['_translated_', '_to_']):
                files_to_translate.append(f)
    
    if not files_to_translate:
        print(f"\nНе найдено файлов {SUPPORTED_EXTENSIONS} в папке.")
        return
    
    print(f"\nНайдено файлов для перевода: {len(files_to_translate)}")
    print(f"Переводы будут сохранены в: {output_folder}")
    
    # Подтверждение
    confirm = input("\nНачать перевод? (y/n): ")
    if confirm.lower() != 'y':
        print("Отменено.")
        return
    
    # Последовательный перевод
    success_count = 0
    error_count = 0
    
    print(f"\nНачинаю последовательный перевод...\n")
    print("-" * 50)
    
    for i, file_path in enumerate(files_to_translate, 1):
        # Вычисляем относительный путь от исходной папки
        try:
            relative_path = file_path.relative_to(folder_path)
        except ValueError:
            relative_path = file_path.name
        
        # Создаем путь для сохранения с сохранением структуры папок
        output_path = output_folder / relative_path.parent / f"{file_path.stem}{TRANSLATION_SUFFIX}_{target_lang.lower()}{file_path.suffix}"
        
        # Создаем подпапки если нужно
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"\n[{i}/{len(files_to_translate)}] Файл: {relative_path}")
        
        # Переводим файл с указанием конкретного пути вывода
        if translate_single_file_to_path(translator, file_path, output_path, source_lang, target_lang):
            success_count += 1
        else:
            error_count += 1
    
    # Итоги
    print("\n" + "=" * 50)
    print("ИТОГИ:")
    print(f"  Всего файлов: {len(files_to_translate)}")
    print(f"  Успешно переведено: {success_count}")
    print(f"  Ошибок: {error_count}")
    print(f"  Переводы сохранены в: {output_folder}")
    print("=" * 50)


def main():
    """Главная функция"""
    print("=" * 50)
    print("DeepL Переводчик научных документов")
    print("=" * 50)
    
    # Проверки
    check_api_key()
    translator = initialize_translator()
    
    # Главное меню
    while True:
        print("\nВыберите действие:")
        print("  1. Перевести один файл")
        print("  2. Перевести папку с файлами")
        print("  3. Выход")
        
        choice = input("\nВаш выбор (1-3): ").strip()
        
        if choice == '1':
            # Перевод одного файла
            file_path_str = input("\nВведите путь к файлу: ").strip().strip('"\'')
            
            # Обрабатываем путь
            try:
                file_path = Path(file_path_str).resolve()
            except Exception as e:
                print(f"Ошибка при обработке пути: {e}")
                continue
            
            if not file_path.exists():
                print(f"Ошибка: Путь не существует: {file_path}")
                continue
                
            if not file_path.is_file():
                print(f"Ошибка: Это не файл: {file_path}")
                continue
            
            print(f"Файл найден: {file_path.name}")
            print(f"Расширение: {file_path.suffix.lower()}")
            
            if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                print(f"Ошибка: Поддерживаются только {SUPPORTED_EXTENSIONS}")
                print(f"Ваш файл имеет расширение: {file_path.suffix}")
                continue
            
            source_lang, target_lang = get_language_choice()
            translate_single_file(translator, file_path, source_lang, target_lang)
            
        elif choice == '2':
            # Перевод папки
            folder_path_str = input("\nВведите путь к папке: ").strip().strip('"\'')
            folder_path = Path(folder_path_str)
            
            if not folder_path.is_dir():
                print("Ошибка: Папка не найдена.")
                continue
            
            source_lang, target_lang = get_language_choice()
            translate_folder(translator, folder_path, source_lang, target_lang)
            
        elif choice == '3':
            print("\nВыход из программы.")
            break
        else:
            print("Неверный выбор.")
    
    print("\nСпасибо за использование!")


if __name__ == "__main__":
    main()