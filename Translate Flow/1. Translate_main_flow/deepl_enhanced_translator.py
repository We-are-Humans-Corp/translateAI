#/usr/bin/env python3
"""
Улучшенный переводчик документов через DeepL API
Расширенные функции для качественного перевода научных статей
На основе deepl_simple_translator_simple.py с улучшениями
"""

import deepl
import os
import sys
import time
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from dotenv import load_dotenv
from enum import Enum

# Загрузка переменных окружения
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

# Конфигурация
DEEPL_API_KEY = os.getenv('DEEPL_API_KEY', '')
SUPPORTED_EXTENSIONS = ['.docx', '.pdf', '.html', '.htm', '.txt']
TRANSLATION_SUFFIX = "_translated"
PAUSE_BETWEEN_REQUESTS = 0.5  # Пауза между запросами в секундах
CACHE_DIR = BASE_DIR / '.translation_cache'
MAX_RETRIES = 3
RETRY_DELAY = 2.0

# Проверка доступности python-docx
DOCX_AVAILABLE = False
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    pass

# Языковые опции (расширенные)
LANGUAGE_OPTIONS = {
    "1": {"name": "Русский -> Английский (US)", "source": "RU", "target": "EN-US"},
    "2": {"name": "Русский -> Английский (GB)", "source": "RU", "target": "EN-GB"},
    "3": {"name": "Английский -> Русский", "source": "EN", "target": "RU"},
    "4": {"name": "Немецкий -> Русский", "source": "DE", "target": "RU"},
    "5": {"name": "Французский -> Русский", "source": "FR", "target": "RU"},
    "6": {"name": "Испанский -> Русский", "source": "ES", "target": "RU"},
    "7": {"name": "Итальянский -> Русский", "source": "IT", "target": "RU"},
    "8": {"name": "Китайский -> Русский", "source": "ZH", "target": "RU"},
    "9": {"name": "Японский -> Русский", "source": "JA", "target": "RU"},
}

# Научные области для глоссариев
SCIENTIFIC_FIELDS = {
    "general": "Общие научные термины",
    "biomedicine": "Биомедицина",
    "physics": "Физика",
    "chemistry": "Химия",
    "mathematics": "Математика",
    "computer_science": "Информатика",
    "engineering": "Инженерия"
}

# Предопределенные научные глоссарии
SCIENTIFIC_GLOSSARIES = {
    "biomedicine": {
        "EN": {
            "hypercortisolism": "гиперкортизолизм",
            "adrenocortical carcinoma": "адренокортикальная карцинома",
            "Cushing's syndrome": "синдром Кушинга",
            "glucocorticosteroid": "глюкокортикостероид",
            "reticular zone": "ретикулярная зона",
            "in vitro": "in vitro",
            "in vivo": "in vivo",
            "apoptosis": "апоптоз",
            "mitochondria": "митохондрии",
            "cytokine": "цитокин"
        }
    },
    "physics": {
        "EN": {
            "quantum entanglement": "квантовая запутанность",
            "wave function": "волновая функция",
            "uncertainty principle": "принцип неопределенности",
            "superposition": "суперпозиция",
            "quantum tunneling": "квантовое туннелирование",
            "Schrödinger equation": "уравнение Шрёдингера",
            "eigenvalue": "собственное значение",
            "Hamiltonian": "гамильтониан"
        }
    },
    "chemistry": {
        "EN": {
            "covalent bond": "ковалентная связь",
            "oxidation state": "степень окисления",
            "stoichiometry": "стехиометрия",
            "catalyst": "катализатор",
            "equilibrium": "равновесие",
            "enthalpy": "энтальпия",
            "entropy": "энтропия"
        }
    },
    "general": {
        "EN": {
            "et al.": "и др.",
            "p-value": "p-значение",
            "confidence interval": "доверительный интервал",
            "standard deviation": "стандартное отклонение",
            "hypothesis": "гипотеза",
            "methodology": "методология",
            "correlation": "корреляция"
        }
    }
}

# Тона для Write API
TONE_OPTIONS = {
    "confident": "Уверенный (для научных выводов)",
    "diplomatic": "Дипломатичный (для дискуссий)",
    "friendly": "Дружелюбный (для введения)",
    "enthusiastic": "Энтузиастичный (для достижений)"
}

# Настройки качества перевода
QUALITY_SETTINGS = {
    "1": {
        "name": "Стандартное качество (быстро)",
        "formality": "default",
        "preserve_formatting": True,
        "tag_handling": "xml",
        "use_write_api": False
    },
    "2": {
        "name": "Высокое качество (формально)",
        "formality": "more",
        "preserve_formatting": True,
        "tag_handling": "xml",
        "use_write_api": False
    },
    "3": {
        "name": "Академический стиль (Pro)",
        "formality": "more",
        "preserve_formatting": True,
        "tag_handling": "xml",
        "use_write_api": True,
        "writing_style": "academic"
    },
    "4": {
        "name": "Бизнес стиль",
        "formality": "more",
        "preserve_formatting": True,
        "tag_handling": "xml",
        "use_write_api": True,
        "writing_style": "business"
    },
    "5": {
        "name": "Простой стиль",
        "formality": "default",
        "preserve_formatting": True,
        "tag_handling": "xml",
        "use_write_api": True,
        "writing_style": "simple"
    }
}


class TranslationCache:
    """Кэширование переводов для оптимизации"""

    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(exist_ok=True)
        self.cache_file = self.cache_dir / 'translations.json'
        self.cache = self._load_cache()
        self.stats_file = self.cache_dir / 'stats.json'
        self.stats = self._load_stats()

    def _load_cache(self) -> Dict:
        """Загрузка кэша из файла"""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Предупреждение: Не удалось загрузить кэш: {e}")
        return {}

    def _load_stats(self) -> Dict:
        """Загрузка статистики"""
        try:
            if self.stats_file.exists():
                with open(self.stats_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {"cache_hits": 0, "cache_misses": 0, "total_chars_saved": 0}

    def _save_cache(self):
        """Сохранение кэша в файл"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Предупреждение: Не удалось сохранить кэш: {e}")

    def _save_stats(self):
        """Сохранение статистики"""
        try:
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.stats, f, indent=2)
        except:
            pass

    def get_hash(self, text: str, source_lang: str, target_lang: str,
                 formality: str = "default") -> str:
        """Генерация хэша для кэширования"""
        key = f"{text[:1000]}|{source_lang}|{target_lang}|{formality}"
        return hashlib.md5(key.encode()).hexdigest()

    def get(self, text: str, source_lang: str, target_lang: str,
            formality: str = "default") -> Optional[str]:
        """Получение перевода из кэша"""
        hash_key = self.get_hash(text, source_lang, target_lang, formality)
        result = self.cache.get(hash_key)

        if result:
            self.stats["cache_hits"] += 1
            self.stats["total_chars_saved"] += len(text)
            self._save_stats()
        else:
            self.stats["cache_misses"] += 1
            self._save_stats()

        return result

    def set(self, text: str, translated_text: str, source_lang: str,
            target_lang: str, formality: str = "default"):
        """Сохранение перевода в кэш"""
        hash_key = self.get_hash(text, source_lang, target_lang, formality)
        self.cache[hash_key] = {
            "translation": translated_text,
            "timestamp": datetime.now().isoformat(),
            "source_preview": text[:100]
        }
        self._save_cache()

    def get_stats(self) -> Dict:
        """Получение статистики кэша"""
        return self.stats

    def clear(self):
        """Очистка кэша"""
        self.cache = {}
        self._save_cache()
        print("Кэш очищен.")


class GlossaryManager:
    """Управление глоссариями для консистентности терминологии"""

    def __init__(self, translator):
        self.translator = translator
        self.glossaries_dir = BASE_DIR / 'glossaries'
        self.glossaries_dir.mkdir(exist_ok=True)
        self.glossaries = {}

    def create_glossary(self, name: str, source_lang: str, target_lang: str,
                        entries: Dict[str, str]) -> Optional[str]:
        """Создание глоссария"""
        try:
            # Проверяем поддержку глоссариев
            if not hasattr(self.translator, 'create_glossary'):
                print("Предупреждение: Глоссарии не поддерживаются в текущей версии API")
                return None

            # Форматирование записей для DeepL
            entries_str = '\n'.join([f"{k}\t{v}" for k, v in entries.items()])

            glossary = self.translator.create_glossary(
                name=name,
                source_lang=source_lang,
                target_lang=target_lang,
                entries=entries_str,
                entries_format="tsv"
            )

            # Сохраняем локальную копию
            glossary_file = self.glossaries_dir / f"{name}.json"
            with open(glossary_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "id": glossary.glossary_id,
                    "name": name,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "entries": entries,
                    "created": datetime.now().isoformat()
                }, f, ensure_ascii=False, indent=2)

            self.glossaries[name] = glossary.glossary_id
            print(f"✓ Глоссарий '{name}' создан успешно")
            return glossary.glossary_id

        except Exception as e:
            print(f"Ошибка создания глоссария: {e}")
            return None

    def load_glossary_from_file(self, file_path: Path) -> Optional[Dict]:
        """Загрузка глоссария из файла"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                if file_path.suffix == '.json':
                    return json.load(f)
                elif file_path.suffix in ['.txt', '.tsv']:
                    entries = {}
                    for line in f:
                        parts = line.strip().split('\t')
                        if len(parts) == 2:
                            entries[parts[0]] = parts[1]
                    return entries
        except Exception as e:
            print(f"Ошибка загрузки глоссария: {e}")
        return None

    def list_glossaries(self) -> List[Dict]:
        """Список доступных глоссариев"""
        glossaries = []
        for file in self.glossaries_dir.glob("*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    glossaries.append(data)
            except:
                continue
        return glossaries

    def create_scientific_glossary(self, field: str, source_lang: str = "EN",
                                   target_lang: str = "RU") -> Optional[str]:
        """Создание предопределенного научного глоссария"""
        if field not in SCIENTIFIC_GLOSSARIES:
            print(f"Предупреждение: Область '{field}' не найдена в предопределенных глоссариях")
            return None

        if source_lang not in SCIENTIFIC_GLOSSARIES[field]:
            print(f"Предупреждение: Язык {source_lang} не поддерживается для области {field}")
            return None

        entries = SCIENTIFIC_GLOSSARIES[field][source_lang]
        glossary_name = f"Scientific_{field}_{source_lang}_{target_lang}"

        print(f"Создание научного глоссария: {SCIENTIFIC_FIELDS[field]}")
        print(f"Терминов: {len(entries)}")

        return self.create_glossary(glossary_name, source_lang, target_lang, entries)


class EnhancedTranslator:
    """Расширенный переводчик с дополнительными функциями"""

    def __init__(self):
        self.translator = None
        self.cache = TranslationCache()
        self.glossary_manager = None
        self.write_api_available = False
        self.usage_stats = {
            "documents_translated": 0,
            "characters_processed": 0,
            "errors_encountered": 0
        }

    def check_api_key(self) -> bool:
        """Проверка наличия API ключа"""
        if not DEEPL_API_KEY:
            print("Ошибка: Ключ DeepL API не найден.")
            print("Создайте файл .env и добавьте:")
            print("DEEPL_API_KEY=your_api_key_here")
            return False
        return True

    def initialize(self) -> bool:
        """Инициализация переводчика с проверкой возможностей"""
        print("\nИнициализация DeepL...")

        if not self.check_api_key():
            return False

        try:
            self.translator = deepl.Translator(DEEPL_API_KEY)

            # Проверка лимитов
            usage = self.translator.get_usage()
            if usage.character.count and usage.character.limit:
                remaining = usage.character.limit - usage.character.count
                percentage = (usage.character.count / usage.character.limit) * 100
                print(f"Использовано: {usage.character.count:,} / {usage.character.limit:,} символов")
                print(f"Осталось: {remaining:,} символов ({100-percentage:.1f}%)")

                if remaining <= 0:
                    print("Ошибка: Лимит символов исчерпан!")
                    return False
                elif remaining < 10000:
                    print("⚠ Предупреждение: Осталось мало символов!")

            # Проверка доступности Write API
            self._check_write_api_availability()

            # Инициализация менеджера глоссариев
            self.glossary_manager = GlossaryManager(self.translator)

            # Показ статистики кэша
            cache_stats = self.cache.get_stats()
            if cache_stats["cache_hits"] > 0:
                print(f"\n📊 Статистика кэша:")
                print(f"  Попадания: {cache_stats['cache_hits']}")
                print(f"  Промахи: {cache_stats['cache_misses']}")
                print(f"  Сэкономлено символов: {cache_stats['total_chars_saved']:,}")

            print("\n✓ Инициализация успешна.\n")
            return True

        except deepl.AuthorizationException:
            print("Ошибка: Неверный API ключ.")
            return False
        except Exception as e:
            print(f"Ошибка инициализации: {e}")
            return False

    def _check_write_api_availability(self):
        """Проверка доступности Write API"""
        try:
            # Пробуем использовать Write API (если доступен в библиотеке)
            if hasattr(self.translator, 'rephrase_text'):
                # Тестовый запрос
                result = self.translator.rephrase_text(
                    "Test",
                    target_lang="EN-US",
                    style="default"
                )
                self.write_api_available = True
                print("✓ Write API доступен (Pro аккаунт)")
            else:
                print("ℹ Write API недоступен (требуется Pro подписка)")
        except:
            self.write_api_available = False
            print("ℹ Write API недоступен")

    def translate_text_with_retry(self, text: str, source_lang: str,
                                  target_lang: str, **kwargs) -> Optional[str]:
        """Перевод текста с повторными попытками при ошибке"""
        for attempt in range(MAX_RETRIES):
            try:
                # Проверяем кэш
                cached = self.cache.get(
                    text, source_lang, target_lang,
                    kwargs.get('formality', 'default')
                )

                if cached:
                    print("  📋 Использован кэш")
                    return cached

                # Выполняем перевод
                result = self.translator.translate_text(
                    text,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    **kwargs
                )

                translated = result.text if hasattr(result, 'text') else str(result)

                # Сохраняем в кэш
                self.cache.set(
                    text, translated, source_lang, target_lang,
                    kwargs.get('formality', 'default')
                )

                return translated

            except deepl.QuotaExceededException:
                print("✗ Превышена квота API")
                break
            except deepl.TooManyRequestsException:
                wait_time = RETRY_DELAY * (attempt + 1)
                print(f"  ⏱ Слишком много запросов. Ожидание {wait_time} сек...")
                time.sleep(wait_time)
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print(f"  ⚠ Попытка {attempt + 1}/{MAX_RETRIES} не удалась: {e}")
                    time.sleep(RETRY_DELAY)
                else:
                    print(f"✗ Ошибка перевода: {e}")
                    self.usage_stats["errors_encountered"] += 1
                    break

        return None

    def apply_write_api_improvement(self, text: str, target_lang: str,
                                   style: str = "academic") -> str:
        """Улучшение текста через Write API (если доступен)"""
        if not self.write_api_available:
            return text

        try:
            if hasattr(self.translator, 'rephrase_text'):
                result = self.translator.rephrase_text(
                    text,
                    target_lang=target_lang,
                    style=style
                )
                return result.text if hasattr(result, 'text') else str(result)
        except Exception as e:
            print(f"  ⚠ Не удалось применить улучшение стиля: {e}")

        return text

    def translate_document_enhanced(self, file_path: Path, output_path: Path,
                                   source_lang: str, target_lang: str,
                                   quality_setting: Dict,
                                   glossary_id: Optional[str] = None) -> bool:
        """Улучшенный перевод документа с дополнительными опциями"""

        print(f"\n{'='*60}")
        print(f"📄 Перевод: {file_path.name}")
        print(f"🔄 Направление: {source_lang} -> {target_lang}")
        print(f"⚙ Настройки: {quality_setting['name']}")
        if glossary_id:
            print(f"📚 Глоссарий применен")
        print(f"{'='*60}\n")

        # Проверка существования выходного файла
        if output_path.exists():
            overwrite = input(f"\nФайл {output_path.name} существует. Перезаписать? (y/n): ")
            if overwrite.lower() != 'y':
                print("Пропуск файла.")
                return False

        try:
            start_time = time.time()
            file_size = file_path.stat().st_size

            print(f"📏 Размер файла: {file_size:,} байт")

            # Подготовка параметров перевода
            translation_params = {
                "input_path": str(file_path),
                "output_path": str(output_path),
                "source_lang": source_lang,
                "target_lang": target_lang
            }

            # Добавляем formality если поддерживается
            formality_supported_langs = ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'PT-PT', 'PT-BR', 'RU', 'JA']
            if target_lang in formality_supported_langs and quality_setting.get('formality') != 'default':
                translation_params["formality"] = quality_setting['formality']
                print(f"  ✓ Применена формальность: {quality_setting['formality']}")

            # Добавляем глоссарий если есть
            if glossary_id and hasattr(self.translator, 'translate_document_from_filepath'):
                translation_params["glossary"] = glossary_id
                print(f"  ✓ Глоссарий применен")

            # Этап 1: Перевод документа
            print("\n⏳ Этап 1: Перевод документа...")
            self.translator.translate_document_from_filepath(**translation_params)

            elapsed_translation = time.time() - start_time
            print(f"  ✓ Документ переведен за {elapsed_translation:.1f} сек.")

            # Этап 2: Применение Write API для улучшения стиля (если доступен и включен)
            if (quality_setting.get('use_write_api') and
                self.write_api_available and
                output_path.suffix.lower() == '.docx' and
                DOCX_AVAILABLE):

                print("\n⏳ Этап 2: Улучшение стиля (Write API)...")

                try:
                    # Извлекаем текст из DOCX
                    doc = Document(output_path)
                    improved_count = 0

                    for para in doc.paragraphs:
                        if para.text.strip() and len(para.text) > 50:
                            original_text = para.text
                            improved_text = self.apply_write_api_improvement(
                                original_text,
                                target_lang,
                                quality_setting.get('writing_style', 'academic')
                            )

                            if improved_text != original_text:
                                para.text = improved_text
                                improved_count += 1

                            # Пауза между запросами
                            if PAUSE_BETWEEN_REQUESTS > 0:
                                time.sleep(PAUSE_BETWEEN_REQUESTS)

                    if improved_count > 0:
                        doc.save(output_path)
                        print(f"  ✓ Улучшено {improved_count} параграфов")
                    else:
                        print("  ℹ Улучшения не требуются")

                except Exception as e:
                    print(f"  ⚠ Не удалось применить улучшения: {e}")

            # Обновление статистики
            self.usage_stats["documents_translated"] += 1
            self.usage_stats["characters_processed"] += file_size  # Приблизительно

            elapsed_total = time.time() - start_time

            print(f"\n{'='*60}")
            print(f"✅ УСПЕШНО ЗАВЕРШЕНО")
            print(f"⏱ Общее время: {elapsed_total:.1f} сек.")
            print(f"💾 Сохранено: {output_path.name}")
            print(f"{'='*60}\n")

            # Пауза между запросами
            if PAUSE_BETWEEN_REQUESTS > 0:
                time.sleep(PAUSE_BETWEEN_REQUESTS)

            return True

        except deepl.DocumentTranslationException as e:
            print(f"✗ Ошибка перевода документа: {e}")
            self.usage_stats["errors_encountered"] += 1
            return False
        except deepl.QuotaExceededException:
            print("✗ Превышена квота API")
            return False
        except Exception as e:
            print(f"✗ Непредвиденная ошибка: {e}")
            self.usage_stats["errors_encountered"] += 1
            import traceback
            traceback.print_exc()
            return False

    def translate_folder_enhanced(self, folder_path: Path, source_lang: str,
                                 target_lang: str, quality_setting: Dict,
                                 glossary_id: Optional[str] = None):
        """Перевод папки с файлами с расширенными опциями"""

        # Создаем папку для переводов
        output_folder = folder_path.parent / f"{folder_path.name}_translated_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        print(f"\n📁 Создаю папку для переводов: {output_folder}")
        try:
            output_folder.mkdir(exist_ok=True)
        except Exception as e:
            print(f"Ошибка при создании папки: {e}")
            return

        # Поиск файлов
        files_found = []
        for ext in SUPPORTED_EXTENSIONS:
            files_found.extend(folder_path.rglob(f"*{ext}"))

        # Фильтрация файлов
        files_to_translate = []
        for f in files_found:
            if f.is_file() and not f.name.startswith('~$'):
                if not any(suffix in f.stem for suffix in ['_translated_', '_to_']):
                    files_to_translate.append(f)

        if not files_to_translate:
            print(f"\n❌ Не найдено файлов {SUPPORTED_EXTENSIONS} в папке.")
            return

        print(f"\n📊 Найдено файлов для перевода: {len(files_to_translate)}")
        print(f"💾 Переводы будут сохранены в: {output_folder}")

        # Показываем список файлов
        print("\n📋 Файлы для перевода:")
        for i, file in enumerate(files_to_translate[:10], 1):
            print(f"  {i}. {file.name}")
        if len(files_to_translate) > 10:
            print(f"  ... и еще {len(files_to_translate) - 10} файлов")

        # Подтверждение
        confirm = input("\n▶ Начать перевод? (y/n): ")
        if confirm.lower() != 'y':
            print("Отменено.")
            return

        # Последовательный перевод
        success_count = 0
        error_count = 0
        skipped_count = 0

        print(f"\n🚀 Начинаю последовательный перевод...\n")
        print("=" * 60)

        for i, file_path in enumerate(files_to_translate, 1):
            # Вычисляем относительный путь
            try:
                relative_path = file_path.relative_to(folder_path)
            except ValueError:
                relative_path = file_path.name

            # Создаем путь для сохранения
            output_path = output_folder / relative_path.parent / f"{file_path.stem}{TRANSLATION_SUFFIX}_{target_lang.lower()}{file_path.suffix}"

            # Создаем подпапки если нужно
            output_path.parent.mkdir(parents=True, exist_ok=True)

            print(f"\n[{i}/{len(files_to_translate)}] 📄 {relative_path}")

            # Проверяем, не существует ли уже файл
            if output_path.exists():
                print("  ⏭ Пропуск: файл уже существует")
                skipped_count += 1
                continue

            # Переводим файл
            if self.translate_document_enhanced(
                file_path, output_path, source_lang, target_lang,
                quality_setting, glossary_id
            ):
                success_count += 1
            else:
                error_count += 1

        # Итоги
        print("\n" + "=" * 60)
        print("📊 ИТОГИ:")
        print(f"  📁 Всего файлов: {len(files_to_translate)}")
        print(f"  ✅ Успешно переведено: {success_count}")
        print(f"  ❌ Ошибок: {error_count}")
        print(f"  ⏭ Пропущено: {skipped_count}")
        print(f"  💾 Переводы сохранены в: {output_folder}")
        print("=" * 60)

        # Статистика использования
        self._print_usage_stats()

    def _print_usage_stats(self):
        """Вывод статистики использования"""
        print(f"\n📈 Статистика сессии:")
        print(f"  Документов переведено: {self.usage_stats['documents_translated']}")
        print(f"  Символов обработано: ~{self.usage_stats['characters_processed']:,}")
        print(f"  Ошибок встречено: {self.usage_stats['errors_encountered']}")

        cache_stats = self.cache.get_stats()
        if cache_stats['cache_hits'] > 0:
            hit_rate = cache_stats['cache_hits'] / (cache_stats['cache_hits'] + cache_stats['cache_misses']) * 100
            print(f"  Эффективность кэша: {hit_rate:.1f}%")
            print(f"  Сэкономлено символов: {cache_stats['total_chars_saved']:,}")


def get_language_choice() -> Tuple[str, str]:
    """Выбор направления перевода (расширенный)"""
    print("\n🌍 Выберите направление перевода:")
    for key, value in LANGUAGE_OPTIONS.items():
        print(f"  {key}: {value['name']}")

    while True:
        choice = input(f"\nВведите номер (1-{len(LANGUAGE_OPTIONS)}): ").strip()
        if choice in LANGUAGE_OPTIONS:
            lang = LANGUAGE_OPTIONS[choice]
            return lang['source'], lang['target']
        print("❌ Неверный выбор. Попробуйте снова.")


def get_quality_choice() -> Dict:
    """Выбор качества перевода"""
    print("\n⚙ Выберите настройки качества:")
    for key, value in QUALITY_SETTINGS.items():
        suffix = " (требует Pro)" if value.get('use_write_api') else ""
        print(f"  {key}: {value['name']}{suffix}")

    while True:
        choice = input(f"\nВведите номер (1-{len(QUALITY_SETTINGS)}): ").strip()
        if choice in QUALITY_SETTINGS:
            return QUALITY_SETTINGS[choice]
        print("❌ Неверный выбор. Попробуйте снова.")


def manage_glossaries(translator: EnhancedTranslator) -> Optional[str]:
    """Управление глоссариями"""
    print("\n📚 Управление глоссариями")
    print("  1. Использовать существующий глоссарий")
    print("  2. Создать новый глоссарий вручную")
    print("  3. Создать научный глоссарий из шаблона")
    print("  4. Импортировать глоссарий из файла")
    print("  5. Не использовать глоссарий")

    choice = input("\nВыберите действие (1-5): ").strip()

    if choice == '1':
        # Список существующих глоссариев
        glossaries = translator.glossary_manager.list_glossaries()
        if not glossaries:
            print("❌ Нет сохраненных глоссариев")
            return None

        print("\n📋 Доступные глоссарии:")
        for i, g in enumerate(glossaries, 1):
            print(f"  {i}. {g['name']} ({g['source_lang']} -> {g['target_lang']})")
            print(f"     Записей: {len(g['entries'])}")

        idx = input("\nВыберите номер глоссария: ").strip()
        try:
            selected = glossaries[int(idx) - 1]
            return selected.get('id')
        except:
            print("❌ Неверный выбор")
            return None

    elif choice == '2':
        # Создание нового глоссария
        name = input("Введите имя глоссария: ").strip()
        source = input("Исходный язык (например, RU): ").strip().upper()
        target = input("Целевой язык (например, EN-US): ").strip().upper()

        print("\nВведите термины (формат: исходный_термин -> перевод)")
        print("Пустая строка для завершения")

        entries = {}
        while True:
            entry = input("> ").strip()
            if not entry:
                break

            parts = entry.split('->')
            if len(parts) == 2:
                entries[parts[0].strip()] = parts[1].strip()
            else:
                print("❌ Неверный формат. Используйте: термин -> перевод")

        if entries:
            glossary_id = translator.glossary_manager.create_glossary(
                name, source, target, entries
            )
            return glossary_id

    elif choice == '3':
        # Создание научного глоссария из шаблона
        print("\n🔬 Доступные научные области:")
        for idx, (key, name) in enumerate(SCIENTIFIC_FIELDS.items(), 1):
            print(f"  {idx}. {name} ({key})")

        field_choice = input(f"\nВыберите область (1-{len(SCIENTIFIC_FIELDS)}): ").strip()
        try:
            field_key = list(SCIENTIFIC_FIELDS.keys())[int(field_choice) - 1]
            print(f"\n✓ Выбрана область: {SCIENTIFIC_FIELDS[field_key]}")

            source = input("Исходный язык (EN): ").strip().upper() or "EN"
            target = input("Целевой язык (RU): ").strip().upper() or "RU"

            glossary_id = translator.glossary_manager.create_scientific_glossary(
                field_key, source, target
            )
            return glossary_id
        except (ValueError, IndexError):
            print("❌ Неверный выбор")
            return None

    elif choice == '4':
        # Импорт из файла
        file_path = input("Путь к файлу глоссария: ").strip().strip('"\'')
        file_path = Path(file_path)

        if not file_path.exists():
            print("❌ Файл не найден")
            return None

        entries = translator.glossary_manager.load_glossary_from_file(file_path)
        if entries:
            name = input("Имя глоссария: ").strip()
            source = input("Исходный язык: ").strip().upper()
            target = input("Целевой язык: ").strip().upper()

            glossary_id = translator.glossary_manager.create_glossary(
                name, source, target, entries
            )
            return glossary_id

    return None


def main():
    """Главная функция"""
    print("=" * 60)
    print("🚀 DeepL Enhanced Translator")
    print("📚 Улучшенный переводчик научных документов")
    print("=" * 60)

    # Инициализация
    translator = EnhancedTranslator()
    if not translator.initialize():
        sys.exit(1)

    # Главное меню
    while True:
        print("\n📋 ГЛАВНОЕ МЕНЮ:")
        print("  1. Перевести один файл")
        print("  2. Перевести папку с файлами")
        print("  3. Управление глоссариями")
        print("  4. Очистить кэш переводов")
        print("  5. Показать статистику")
        print("  6. Выход")

        choice = input("\nВаш выбор (1-6): ").strip()

        if choice == '1':
            # Перевод одного файла
            file_path_str = input("\n📄 Введите путь к файлу: ").strip().strip('"\'')

            try:
                file_path = Path(file_path_str).resolve()
            except Exception as e:
                print(f"❌ Ошибка при обработке пути: {e}")
                continue

            if not file_path.exists():
                print(f"❌ Путь не существует: {file_path}")
                continue

            if not file_path.is_file():
                print(f"❌ Это не файл: {file_path}")
                continue

            print(f"✅ Файл найден: {file_path.name}")
            print(f"📎 Расширение: {file_path.suffix.lower()}")

            if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                print(f"❌ Поддерживаются только {SUPPORTED_EXTENSIONS}")
                continue

            # Выбор языков
            source_lang, target_lang = get_language_choice()

            # Выбор качества
            quality_setting = get_quality_choice()

            # Опционально: выбор глоссария
            glossary_id = None
            use_glossary = input("\n📚 Использовать глоссарий? (y/n): ").strip().lower()
            if use_glossary == 'y':
                glossary_id = manage_glossaries(translator)

            # Генерация имени выходного файла
            output_path = file_path.with_name(
                f"{file_path.stem}{TRANSLATION_SUFFIX}_{target_lang.lower()}{file_path.suffix}"
            )

            # Перевод
            translator.translate_document_enhanced(
                file_path, output_path, source_lang, target_lang,
                quality_setting, glossary_id
            )

        elif choice == '2':
            # Перевод папки
            folder_path_str = input("\n📁 Введите путь к папке: ").strip().strip('"\'')
            folder_path = Path(folder_path_str)

            if not folder_path.is_dir():
                print("❌ Папка не найдена.")
                continue

            # Выбор языков
            source_lang, target_lang = get_language_choice()

            # Выбор качества
            quality_setting = get_quality_choice()

            # Опционально: выбор глоссария
            glossary_id = None
            use_glossary = input("\n📚 Использовать глоссарий? (y/n): ").strip().lower()
            if use_glossary == 'y':
                glossary_id = manage_glossaries(translator)

            # Перевод папки
            translator.translate_folder_enhanced(
                folder_path, source_lang, target_lang,
                quality_setting, glossary_id
            )

        elif choice == '3':
            # Управление глоссариями
            manage_glossaries(translator)

        elif choice == '4':
            # Очистка кэша
            confirm = input("\n⚠ Очистить весь кэш переводов? (y/n): ").strip().lower()
            if confirm == 'y':
                translator.cache.clear()
                print("✅ Кэш очищен")

        elif choice == '5':
            # Показать статистику
            translator._print_usage_stats()

            # Также показываем использование API
            try:
                usage = translator.translator.get_usage()
                if usage.character.count and usage.character.limit:
                    remaining = usage.character.limit - usage.character.count
                    percentage = (usage.character.count / usage.character.limit) * 100
                    print(f"\n📊 Использование API:")
                    print(f"  Использовано: {usage.character.count:,} символов")
                    print(f"  Лимит: {usage.character.limit:,} символов")
                    print(f"  Осталось: {remaining:,} символов ({100-percentage:.1f}%)")
            except:
                pass

        elif choice == '6':
            print("\n👋 Выход из программы.")
            break
        else:
            print("❌ Неверный выбор.")

    print("\n✨ Спасибо за использование DeepL Enhanced Translator!")

    # Финальная статистика
    if translator.usage_stats["documents_translated"] > 0:
        translator._print_usage_stats()


if __name__ == "__main__":
    main()