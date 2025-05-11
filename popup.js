class Good_detective {
    constructor() {
        this.initUI();
        this.cache = new Map(); // Кеш: URL → { timestamp, data }
        this.CACHE_TTL = 300000; // 5 минут (в мс)
        this.init_progress_bar();
    }

    initUI() {
        const container = document.createElement("div");
        container.className = 'search_container';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'search_input';
        input.placeholder = 'Найдётся далеко не всё, и совсем не сразу...';
        //Для отправки по enter
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.search_starter(); // Вызываем поиск при нажатии Enter
            }
        });

        const tap_to_investigate = document.createElement('tap_to_investigate');
        tap_to_investigate.textContent = 'Поиск';
        tap_to_investigate.addEventListener('click', () => this.search_starter());

        const results_div = document.createElement('div');
        results_div.id = 'Barrister';

        container.appendChild(input);
        container.appendChild(tap_to_investigate);
        container.appendChild(results_div);

        const insertion = document.querySelector('#content')
        document.body.insertBefore(container, insertion);

        this.add_styles();
    }

    init_progress_bar() {
        this.progressContainer = document.createElement('div');
        this.progressContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      padding: 10px;
      border: 1px solid #ccc;
      z-index: 1000;
    `;
        document.body.appendChild(this.progressContainer);
    }

    update_progress(current, total) {
        this.progressContainer.innerHTML = `
      <div>Загружено: ${current} из ${total}</div>
      <progress value="${current}" max="${total}" style="width: 100%"></progress>
    `;
    }

    add_styles() {
        const style = document.createElement('style');

        style.textContent = `
        
        .search_container {
          margin-left: auto;
          margin-right: 0em;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba (0,0,0,0.1);
        }
        
        #search_input {
          padding: 8px;
          width: 300px;
          margin-right: 10px;
        }
        
        tap_to_investigate {
          padding: 8px 16px;
          background: #43afc0;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        tap_to_investigate:hover {
          background: #3ab3a3;
        }
        
        #Barrister {
          margin-top: 20px;
        }
        
        .result_item {
          padding: 10px;
          margin: 5px 0;
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .match {
          background-color: yellow;
          font-weight: bold;
        }
        
        .page_url {
          color: #666;
          font-size: 0.9em;
          margin-bottom: 5px;
        }
        
        .highlight_scroll {
            animation: highlight-fade 2s ease;
        }
        
        @keyframes highlight-fade {
            0% { background-color: yellow; }
            100% { background-color: transparent; }
        }
        
        .result_item {
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .result_item:hover {
            background-color: #3ab3a3;
        }
        `;

        document.head.appendChild(style);
    }

    async search_starter() {
        const query = document.getElementById('search_input').value.trim().toLowerCase(); //Убираем чувствительность к регистру
        if(!query) {
            this.show_message('Пустой запрос');
            return;
        }

        this.show_message('Ищу...');

        try {
            // 1. Сбор уникальных ссылок на странице
            const links = this.collect_all_links();

            // 2. Поиск на текущей странице
            const current_page_results = this.search_current_page(query);

            // 3. Поиск по внешним страницам
            const external_results = await this.search_external_pages(links, query);

            // 4. Объединение результатов
            const all_results = [...current_page_results, ...external_results];

            // 5. Отображение результатов
            this.display_results(all_results, query);
        } catch (error) {
            console.error('Ошибка при выполнении поиска:', error);
            this.show_message('Произошла ошибка при выполнении поиска');
        }
    }

    // 1. Сбор уникальных ссылок на странице
    collect_all_links() {
        const links = new Set();
        //Ограничение поиска только по ссылкам в списке сущностей
        const entity_list = document.querySelector("#main-content > main > div.chapter-content > div")
        entity_list.querySelectorAll('a[href]').forEach(link => {
            const href = link.href;

            //Фильтр лишних ссылок. Возможно, он не нужен
            if (href &&
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            href !== window.location.href) {
                links.add(href)
            }
        });

        return Array.from(links);
    };

    // 2. Поиск на текущей странице
    search_current_page(query) {
        const results = [];

        //Ограничение поиска только по ссылкам в списке сущностей
        const entity_list = document.querySelector("#main-content > main > div.chapter-content > div")

        //Поиск по тексту в заголовках и в теле
        entity_list.querySelectorAll("a > div > h4 /*селектор заголовка*/, a > div > div > p/*селектор тела*/" ).forEach(link => {
            const text = link.textContent.toLowerCase(); //Убираем чувствительность к регистру
            if (text.includes(query)) {
                console.log(text)
                results.push({
                    pageUrl: window.location.href,
                    element: link,
                    text: text,
                    href: link.href,
                    isExternal: false
                })
            }
        })

        return results;
    }

    // 3. Поиск по внешним страницам
    /*async search_external_pages(urls, query) {
        const results = [];

        for (const url of urls) {
            try {
                const response = await fetch(url);

                if (!response.ok) continue;

                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html')

                doc.querySelectorAll("#main-content > main > div.page-content.clearfix > div").forEach(link => {
                    const text = link.textContent;
                    if (text.includes(query)) {
                        results.push({
                            pageUrl: url,
                            element: null, // Нет доступа к элементу внешнего документа
                            text: text,
                            href: link.href,
                            isExternal: true
                        });
                    }
                });
            } catch (error) {
                console.error(`Ошибка при поиске по ${url}:`, error);
            }
        }

        return results;
    }
    }*/
    async search_external_pages(urls, query) {
        const contentSelector = '#main-content > main > div.page-content.clearfix';
        let completed = 0;

        // Обновляем прогресс (0 загружено)
        this.update_progress(0, urls.length);

        // Запускаем параллельную загрузку и обработку
        const results = await Promise.all(
            urls.map(async url => {
                try {
                    // Проверяем кеш
                    if (this.cache.has(url)) {
                        const cached = this.cache.get(url);
                        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
                            return cached.data; // Возвращаем кешированные данные
                        }
                    }

                    // Загрузка с таймаутом
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут

                    const response = await fetch(url, {
                        signal: controller.signal
                    });
                    clearTimeout(timeout);

                    const html = await response.text();
                    const doc = new DOMParser().parseFromString(html, 'text/html');

                    // Ищем только в целевом блоке
                    const contentBlock = doc.querySelector(contentSelector);
                    if (!contentBlock) return [];

                    // Поиск ссылок в блоке + ограничение текста
                    const pageResults = [];
                    contentBlock.querySelectorAll('div').forEach(link => {
                        if (link.textContent.toLowerCase().includes(query)) {
                            pageResults.push({
                                pageUrl: url,
                                text: this.trim_query(link.textContent, query), // Обрезаем текст
                                href: link.href,
                                isExternal: true
                            });
                        }
                    });

                    // Обновляем прогресс
                    completed++;
                    this.update_progress(completed, urls.length);

                    // Сохраняем в кеш
                    this.cache.set(url, {
                        timestamp: Date.now(),
                        data: pageResults
                    });

                    return pageResults;
                } catch (error) {
                    completed++;
                    this.update_progress(completed, urls.length);
                    console.error(`Ошибка при обработке ${url}:`, error);
                    return [];
                }
            })
        );
        console.log(results.flat())
        return results.flat(); // Преобразуем массив массивов в один массив
    }


    // 5. Отображение результатов
    display_results(results, query) {
        const results_container = document.getElementById('Barrister')

        if (results.length === 0) {
            results_container.innerHTML = '<p>Расследование не принесло результатов.</p>';
            return;
        }

        let html = `<h3>Найдено ${results.length} совпадения:</h3>`;

        results.forEach((result, index) => {
            const highlighted_text = this.highlight_matches(result.text, query);

            html += `
            <div class="result_item" data-index="${index}">
                <div class="page_url">${result.isExternal ? 'Внешняя страница: ' : 'Текущая страница: '}
                  <a href="${result.pageUrl}" target="_blank">${result.pageUrl}</a>
                </div>
                ${result.href ? `<div>Ссылка: <a href="${result.href}" target="_blank">${result.href}</a></div>` : ''}
                <div class="search_result_text">${highlighted_text}</div>
            </div>
        `;
        });

        results_container.innerHTML = html;

        this.scroll_on_click_handler(results);
    }

    //Вспомогательные функции. Как же их много.

    //Вспомогательная функция для обрезки поисковых результатов
    trim_query(text, query, maxLength = 100) {
        const lowerText = text.toLowerCase();
        const queryIndex = lowerText.indexOf(query);

        if (queryIndex === -1) {
            return text.length > maxLength
                ? text.substring(0, maxLength) + '...'
                : text;
        }
        // Вычисляем начальную и конечную позиции для обрезки
        const start = Math.max(0, queryIndex - 20);
        const end = Math.min(text.length, queryIndex + query.length + 80);

        let result = text.substring(start, end);
        if (start > 0) result = '...' + result;
        if (end < text.length) result += '...';

        return result;
    }

    //Вспомогательная функция, которая подсвечивает совпадения в тексте
    highlight_matches(text, query) {
        const regex = new RegExp(query, 'gi');
        return text.replace(regex, match => `<span class="match">${match}</span>`);
    }

    //Вспомогательная функция для прокрутки до найденного результата
    scroll_on_click_handler(results) {
        document.querySelectorAll('.result_item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const result = results[index];

                // Если результат с текущей страницы и есть DOM-элемент
                if (!result.isExternal && result.element) {
                    // Плавная прокрутка к элементу
                    result.element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    })
                } else {
                    window.open(result.pageUrl);
                }
            });
        });
    }

    //Вспомогательная функция для отображения сообщений
    show_message(message) {
        document.getElementById('Barrister').innerHTML = `<p>${message}</p>`;
    }
}
new Good_detective();
