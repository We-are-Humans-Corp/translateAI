#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from collections import defaultdict

def get_folder_path(prompt):
    """Запрашивает путь к папке у пользователя"""
    while True:
        path = input(prompt).strip()
        if os.path.exists(path) and os.path.isdir(path):
            return Path(path)
        else:
            print(f"Ошибка: Путь '{path}' не существует или не является папкой. Попробуйте еще раз.")

def normalize_filename(filename):
    """Нормализует имя файла, убирая подпись перевода"""
    # Убираем расширение для сравнения
    name_without_ext = os.path.splitext(filename)[0]
    
    # Убираем суффиксы перевода и восстановления
    # Ищем паттерны вида _translated_*, _to_*, _restored
    import re
    # Убираем _translated_[язык] или _to_[язык] или _restored в конце
    cleaned = re.sub(r'(_translated_[a-z\-]+|_to_[a-z\-]+|_restored)+$', '', name_without_ext)
    
    return cleaned

def get_articles_structure(root_path):
    """Получает структуру статей в формате {журнал: {статья: путь}}"""
    articles = defaultdict(dict)
    
    # Проходим по папкам журналов
    for journal_dir in root_path.iterdir():
        if journal_dir.is_dir():
            journal_name = journal_dir.name
            
            # Проходим по файлам статей в папке журнала
            for article_file in journal_dir.iterdir():
                if article_file.is_file() and not article_file.name.startswith('.'):
                    normalized_name = normalize_filename(article_file.name)
                    articles[journal_name][normalized_name] = str(article_file)
    
    return articles

def compare_articles(source_path, translation_path):
    """Сравнивает статьи в исходной папке и папке с переводами"""
    print("\nАнализирую структуру папок...")
    
    source_articles = get_articles_structure(source_path)
    translation_articles = get_articles_structure(translation_path)
    
    print(f"\nНайдено журналов в исходниках: {len(source_articles)}")
    print(f"Найдено журналов в переводах: {len(translation_articles)}")
    
    missing_in_translations = []
    missing_in_source = []
    
    # Проверяем статьи в исходниках
    for journal, articles in source_articles.items():
        for article, path in articles.items():
            if journal not in translation_articles or article not in translation_articles[journal]:
                missing_in_translations.append((journal, article, path))
    
    # Проверяем статьи в переводах
    for journal, articles in translation_articles.items():
        for article, path in articles.items():
            if journal not in source_articles or article not in source_articles[journal]:
                missing_in_source.append((journal, article, path))
    
    # Выводим результаты
    print("\n" + "="*80)
    print("РЕЗУЛЬТАТЫ СРАВНЕНИЯ")
    print("="*80)
    
    if missing_in_translations:
        print(f"\n📄 ФАЙЛЫ БЕЗ ПЕРЕВОДА ({len(missing_in_translations)}):")
        print("-"*80)
        for journal, article, path in sorted(missing_in_translations):
            filename = os.path.basename(path)
            print(f"❌ {filename}")
            print(f"   Журнал: {journal}")
            print(f"   Полный путь: {path}")
            print("-"*40)
    else:
        print("\n✅ Все статьи из исходников имеют переводы")
    
    if missing_in_source:
        print(f"\n📝 Переводы без исходников ({len(missing_in_source)}):")
        print("-"*80)
        for journal, article, path in sorted(missing_in_source):
            print(f"Журнал: {journal}")
            print(f"Статья: {article}")
            print(f"Путь: {path}")
            print("-"*40)
    else:
        print("\n✅ Все переводы имеют соответствующие исходники")
    
    # Статистика по журналам в виде таблицы
    print("\n📊 Статистика по журналам:")
    print("-"*90)
    print(f"{'№':<3} {'Журнал':<50} {'Исходники':<12} {'Переводы':<12} {'Статус':<10}")
    print("-"*90)
    
    all_journals = set(source_articles.keys()) | set(translation_articles.keys())
    
    for idx, journal in enumerate(sorted(all_journals), 1):
        source_count = len(source_articles.get(journal, {}))
        trans_count = len(translation_articles.get(journal, {}))
        status = "✅ OK" if source_count == trans_count else "⚠️ РАЗНИЦА"
        print(f"{idx:<3} {journal:<50} {source_count:<12} {trans_count:<12} {status:<10}")
    
    print("-"*90)
    total_source = sum(len(articles) for articles in source_articles.values())
    total_trans = sum(len(articles) for articles in translation_articles.values())
    print(f"{'ИТОГО:':<54} {total_source:<12} {total_trans:<12} {'Разница: ' + str(total_source - total_trans)}")
    print("-"*90)
    
    # Краткая сводка потерянных файлов
    if missing_in_translations:
        print("\n" + "="*80)
        print("🔴 СПИСОК ФАЙЛОВ БЕЗ ПЕРЕВОДА:")
        print("="*80)
        for journal, article, path in sorted(missing_in_translations):
            filename = os.path.basename(path)
            print(f"• {filename}")
        print("="*80)

def main():
    print("="*80)
    print("СРАВНЕНИЕ СТАТЕЙ: ИСХОДНИКИ vs ПЕРЕВОДЫ")
    print("="*80)
    print("\nЭтот скрипт сравнивает количество статей в папке с исходниками")
    print("и в папке с переводами, учитывая структуру: папка/журнал/статьи")
    print("\nВ переводах файлы могут иметь подпись после '_', которая игнорируется")
    print("="*80)
    
    # Запрашиваем пути к папкам
    print("\n")
    source_path = get_folder_path("Введите путь к папке с исходниками: ")
    translation_path = get_folder_path("Введите путь к папке с переводами: ")
    
    # Выполняем сравнение
    compare_articles(source_path, translation_path)
    
    print("\n" + "="*80)
    input("\nНажмите Enter для выхода...")

if __name__ == "__main__":
    main()