class Good_detective {
    constructor() {
        this.cache = new Map(); // Кеш: URL → { timestamp, data }
        this.CACHE_TTL = 900000; // 15 минут (в мс)
        this.pendingCache = new Set(); // URL, которые уже в процессе кэширования
        this.contentSelector = '#main-content > main > div.page-content.clearfix'; //Селектор для куска страницы с контентом

        this.caching_starter();
        this.initUI();
        this.init_progress_bar();
    }

    async caching_starter() {
        const links = this.collect_all_links();
        if (links.length === 0) return;

        console.log(`Фоновая загрузка ${links.length} страниц...`);

        // Кэшируем без блокировки интерфейса
        setTimeout(async () => {
            for (const url of links) {
                await this.cachePage(url);
            }
        }, 0);
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

    async cachePage(url) {
        if (this.cache.has(url) || this.pendingCache.has(url)) return;
        this.pendingCache.add(url);

        try {
            const response = await fetch(url);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const contentBlock = doc.querySelector(this.contentSelector);

            if (contentBlock) {
                this.cache.set(url, {
                    timestamp: Date.now(),
                    contentHtml: contentBlock.innerHTML // Сохраняем только HTML блока
                });
                console.debug(`Кэширован блок страницы: ${url}`);
            }
        } catch (error) {
            console.error(`Ошибка кэширования ${url}:`, error);
        } finally {
            this.pendingCache.delete(url);
        }
    }

    init_progress_bar() {
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'progress-container';
        document.querySelector('.search_container').appendChild(this.progressContainer);
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
          margin-left: 2%;
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
          min-height: 150px;
          max-height: 350px;
          overflow-y: auto;
          overflow-x: auto;
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        
        .result-item {
          padding: 15px;
          border: 1px solid #eee;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .match {
          background-color: yellow;
        }
        
        .result_item:hover {
          background: #f9f9f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .external-link {
          color: #0066cc;
          font-weight: bold;
        }
            
        .current-page {
          color: #666;
        }
        
        @keyframes fadeOutHighlight {
          0% {
            background-color: yellow;
          }
          100% {
            background-color: transparent;
          } 
        }
        
        .highlight {
          background-color: yellow;
          font-weight: normal !important;
          padding: 2px 4px;
          border-radius: 3px;
          animation: fadeOutHighlight 0.5s ease-out 2.5s forwards; /* Задержка 2.5s, длительность 0.5s */
        }
        
        .progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          min-width: 120px;
        }
        
        .result-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 800px;
          max-height: 80vh;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
            
        .popup-header {
          padding: 15px;
          background: #f5f5f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #ddd;
        }
            
        .popup-content {
          padding: 20px;
          overflow-y: auto;
          flex-grow: 1;
        }
            
        .close-popup {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
            
        `;

        document.head.appendChild(style);
    }

    async search_starter() {
        const query = document.getElementById('search_input').value.trim().toLowerCase(); //Убираем чувствительность к регистру
        if (!query) {
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
        entity_list.querySelectorAll("a > div > h4 /*селектор заголовка*/, a > div > div > p/*селектор тела*/").forEach(link => {
            const text = link.textContent.toLowerCase(); //Убираем чувствительность к регистру
            const parentLink = link.closest('a');
            const href = parentLink ? parentLink.href : null;

            if (text.includes(query)) {
                //console.log(text)
                console.log(link);
                results.push({
                    pageUrl: window.location.href,
                    element: link,
                    text: text,
                    href: href,
                    isExternal: false
                })
            }
        })

        return results;
    }

    // 3. Поиск по внешним страницам
    async search_external_pages(urls, query) {
        const results = [];
        let completed = 0;
        this.update_progress(completed, urls.length);

        // Обрабатываем каждую страницу
        for (const url of urls) {
            try {
                let contentHtml;
                const cached = this.cache.get(url);

                // 1. Пытаемся взять данные из кэша
                if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
                    contentHtml = cached.contentHtml;
                    console.log(`Данные для ${url} взяты из кэша`);
                }
                // 2. Если в кэше нет или устарело — грузим напрямую
                else {
                    console.log(`Загружаем ${url} напрямую...`);
                    const response = await fetch(url);
                    const html = await response.text();
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const contentBlock = doc.querySelector(this.contentSelector);

                    if (!contentBlock) continue;

                    contentHtml = contentBlock.innerHTML;
                    // Сохраняем в кэш для будущих запросов
                    this.cache.set(url, {
                        timestamp: Date.now(),
                        contentHtml: contentHtml
                    });
                }

                // 3. Ищем совпадения в контенте
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = contentHtml;

                tempDiv.querySelectorAll('div').forEach(div => {
                    if (div.textContent.toLowerCase().includes(query)) {
                        results.push({
                            pageUrl: url,
                            text: this.trim_query(div.textContent, query),
                            isExternal: true
                        });
                    }
                });

            } catch (error) {
                console.error(`Ошибка при обработке ${url}:`, error);
            } finally {
                completed++;
                this.update_progress(completed, urls.length);
            }
        }

        return results;
    }

    // 5. Отображение результатов
    display_results(results, query) {
        const results_container = document.getElementById('Barrister');

        if (results.length === 0) {
            results_container.innerHTML = '<p>Ты первый, кто задал такой запрос. Удачи тебе с твоей увлекательнейшей задачей!</p>';
            return;
        }

        let html = `<h3>Найдено ${results.length} совпадений:</h3><div class="results-grid">`;

        results.forEach((result, index) => {
            const highlighted_text = this.highlight_matches(result.text, query);

            html += `
                <div class="result-item" data-index="${index}">
                    <div class="result-source">
                        ${result.isExternal ?
                `<span class="external-link">Внешняя страница</span>` :
                `<span class="current-page">Текущая страница</span>`}
                    </div>
                    <div class="result-content">${highlighted_text}</div>
                </div>
            `;
        });

        html += `</div>`;

        results_container.innerHTML = html;

        this.setup_result_handlers(results);
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

    //Распределитель на вызов внешних или внутренних обработчиков результатов
    setup_result_handlers(results) {
        document.querySelectorAll('.result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const result = results[index];
                if (!result) return;

                if (result.isExternal) {
                    this.show_external_result_popup(result);
                } else {
                    this.scroll_to_local_result(result);
                }
            });
        });
    }

    //Вспомогательная функция по pop-up окнам
    show_external_result_popup(result) {
        //Мне пока надоело, поэтому тут будет временно открытие в новой вкладке, а не попап. Там чот сложное...
        window.open(result.pageUrl)
    }
    //Вспомогательная функция для прокрутки до найденного результата или открытия страницы
    scroll_to_local_result(result) {
        if (!result.element) return;

        // Подсветка
        const originalHtml = result.element.innerHTML;
        result.element.innerHTML = originalHtml.replace(
            new RegExp(result.text, 'gi'),
            match => `<span class="highlight">${match}</span>`
        );

        // Прокрутка
        result.element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    //Вспомогательная функция для отображения сообщений
    show_message(message) {
        document.getElementById('Barrister').innerHTML = `<p>${message}</p>`;
    }
}

new Good_detective();
