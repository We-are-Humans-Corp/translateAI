# Система перевода документов - Workflows

## Обзор

Система содержит два специализированных workflow для перевода разных типов документов:

### 1. **Translate_json_flow** - Для сложных научных статей
Используется для документов с формулами, сложной структурой, таблицами.

**Последовательность этапов:**
1. **Stage 0: Start.py** - Извлечение всех элементов в JSON
2. **Stage 1: Full.py** - Полная обработка структуры
3. **Stage 2: deepl_with_formula_extraction.py** - Перевод DeepL с сохранением формул
4. **Stage 3: claude.py** - Улучшение перевода через Claude
5. **Stage 4: improved.py** - Финальные улучшения
6. **Stage 4.5: claude_formulas.py** - Восстановление и проверка формул
7. **Stage 5: create_docx.py** - Сборка финального документа

### 2. **Translate_politics** - Для простых статей
Используется для документов без сложных формул (политика, экономика, общие темы).

**Последовательность этапов:**
1. **1. deepl_simple_translator.py** - Прямой перевод через DeepL
2. **2. Full Json Map.py** - Извлечение структуры из переведенного документа
3. **3: claude.py** - Улучшение перевода через Claude
4. **4: create_docx.py** - Сборка финального документа

## Использование

### Автоматический запуск (рекомендуется)

```bash
# Главный скрипт с выбором workflow
python run_translation.py путь/к/документу.docx

# Или напрямую для конкретного workflow:
python "2. Translate_json_flow/run_json_pipeline.py" путь/к/документу.docx
python "3 Translate_politics/run_politics_pipeline.py" путь/к/документу.docx
```

### Ручной запуск по этапам

Для **Translate_json_flow**:
```bash
cd "2. Translate_json_flow"
python "Stage 0: Start.py" путь/к/документу.docx
python "Stage 1: Full.py" путь/к/документу_extraction
python "Stage 2: deepl_with_formula_extraction.py" путь/к/документу_extraction
# и так далее...
```

Для **Translate_politics**:
```bash
cd "3 Translate_politics"
# Сначала переводим
python "1. deepl_simple_translator.py"
# Затем извлекаем из ПЕРЕВЕДЕННОГО файла
python "2. Full Json Map.py" путь/к/документу_translated.docx
python "3: claude.py" путь/к/документу_translated_extraction
python "4: create_docx.py" путь/к/документу_translated_extraction
```

## Важные замечания

1. **Translate_politics**: Stage 2 (Full Json Map) должен получать на вход **переведенный** документ из Stage 1, а не оригинал!

2. Все промежуточные данные сохраняются в директории `документ_extraction/`

3. Финальные документы создаются с суффиксом `_final_` и копируются в исходную папку.

## Требования

- Python 3.8+
- Установленные зависимости (см. requirements.txt)
- API ключи в .env файле:
  - DEEPL_API_KEY
  - ANTHROPIC_API_KEY
  - ASPOSE_LICENSE_PATH