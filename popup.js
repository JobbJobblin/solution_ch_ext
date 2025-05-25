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
    // Функции кэша
    async caching_starter() {
        const links = this.collect_all_links();
        if (links.length === 0) return;
        var currentdate = new Date();
        //console.log(`Фоновая загрузка ${links.length} страниц... (${currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds()})`);

        const promises = links.map(link => this.cachePage(link))
        const Cache_res = await Promise.allSettled(promises)
        var currentdate = new Date();
        //console.log(`Загрузка завершена (${currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds()})`)

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

    //Конструктор
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
        tap_to_investigate.id = 'tap_to_investigate_id'
        tap_to_investigate.textContent = 'Поиск';
        tap_to_investigate.addEventListener('click', () => this.search_starter());

        const results_div = document.createElement('div');
        results_div.id = 'Barrister';

        container.appendChild(input);
        container.appendChild(tap_to_investigate);
        container.appendChild(results_div);

        const insertion = document.querySelector('#content')
        document.body.insertBefore(container, insertion);

        //this.add_styles();
    }

    // Функции строки загрузки
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

    // Функция popup
    async pop_create(url) {
        // Создаем элементы popup
        const pop_overlay = document.createElement('div');
        pop_overlay.className = 'pop_overlay';
        pop_overlay.style.display = 'none';

        const pop_content = document.createElement('div');
        pop_content.className = 'pop_content';

        const pop_closeBtn = document.createElement('button');
        pop_closeBtn.className = 'pop_close_btn';
        pop_closeBtn.innerHTML = '×';
        pop_closeBtn.addEventListener('click', () => pop_overlay.style.display = 'none');

        const pop_body = document.createElement('div');
        pop_body.id = 'pop_body';
        pop_body.className = 'pop_loading';
        pop_body.textContent = 'Загрузка...';

        // Собираем структуру
        pop_content.appendChild(pop_closeBtn);
        pop_content.appendChild(pop_body);
        pop_overlay.appendChild(pop_content);
        document.body.appendChild(pop_overlay);

        // Оповещение об инициализации загрузки
        pop_body.innerHTML = '<div class="loading">Загрузка...</div>';
        pop_overlay.style.display = 'flex';

        let contentHtml;
        const chech = this.cache.get(url);
        // 1. Пытаемся взять данные из кэша
        if (chech && (Date.now() - chech.timestamp < this.CACHE_TTL)) {
            contentHtml = chech.contentHtml;
            pop_body.innerHTML = contentHtml;
        }
        else {
            const response = await fetch(url);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const contentBlock = doc.querySelector(this.contentSelector);

            contentHtml = contentBlock.innerHTML;
            pop_body.innerHTML = contentHtml;
            // Сохраняем в кэш для будущих запросов
            this.cache.set(url, {
                timestamp: Date.now(),
                contentHtml: contentHtml
            });
        }
        /*
        // Загружаем содержимое целиком
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки');
                return response.text();
            })
            .then(html => {
                pop_body.innerHTML = html;
            })
            .catch(error => {
                pop_body.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
            });
        */

        pop_overlay.onclick = function(e) {
            if (e.target === pop_overlay) pop_overlay.style.display = 'none';
        };

    }

    // Стили
   /* add_styles() {

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'additional_styles.css';
        //const style = document.createElement('style');

        //style.textContent = ``;

        document.head.appendChild(link);
    }*/

    // Общая функция для запуска поиска
    async search_starter() {

        //Убираем чувствительность к регистру, ё на е, делим по словам, убираем пробелы
        const trimmed_query = document.getElementById('search_input').value.trim().toLowerCase().replace(/ё/g, 'е').split(/\s+/);
        //console.log(`${trimmed_query}`);
        if (!trimmed_query) {
            this.show_message('Пустой запрос');
            return;
        }

        this.show_message('Ищу...');

        try {
            // 1. Сбор уникальных ссылок на странице
            const links = this.collect_all_links();

            // 2. Поиск на текущей странице
            const current_page_results = this.search_current_page(trimmed_query);

            // 3. Поиск по внешним страницам
            const external_results = await this.search_external_pages(links, trimmed_query);

            // 4. Объединение результатов
            const all_results = [...current_page_results, ...external_results];

            // 5. Отображение результатов
            this.display_results(all_results, trimmed_query);
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
            const text = link.textContent.toLowerCase().replace(/ё/g, 'е'); //Убираем чувствительность к регистру, ё на е
            const parentLink = link.closest('a');
            const href = parentLink ? parentLink.href : null;

            // Поиск по части слова. Не по порядку. Можно добавить доп логику, что, если не нашло ничего, то через some вместо every
            if (query.every(keyword => keyword.length > 0 && text.includes(keyword))) {
            /*if (text.includes(query)) {*/ //Старый поиск
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
                    //console.log(`Данные для ${url} взяты из кэша`);
                }
                // 2. Если в кэше нет или устарело — грузим напрямую
                else {
                    //console.log(`Загружаем ${url} напрямую...`);
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
                    // Поиск по части слова. Не по порядку. Можно добавить доп логику, что, если не нашло ничего, то через some вместо every
                    if (query.every(keyword => keyword.length > 0 && div.textContent.toLowerCase().replace(/ё/g, 'е').includes(keyword))) {
                    //if (div.textContent.toLowerCase().replace(/ё/g, 'е').includes(query)) { // Старый поиск
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

        const lowerText = text.toLowerCase().replace(/ё/g, 'е');//Меняем ё на е в статьях
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
                    this.pop_create(result.pageUrl)
                    // Если не попап, а открытие нового окна
                    // window.open(result.pageUrl);
                } else {
                    this.scroll_to_local_result(result);
                }
            });
        });
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
