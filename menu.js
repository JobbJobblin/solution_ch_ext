document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggleFeature');
    const statusLabel = document.getElementById('toggleLabel');

    // Загружаем сохранённое состояние при открытии popup
    chrome.storage.sync.get(['featureEnabled'], function(result) {
        const isEnabled = result.featureEnabled || true;
        toggle.checked = isEnabled;
        updateStatusLabel(isEnabled);
    });

    // Обработчик изменения состояния переключателя
    toggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({ featureEnabled: isEnabled }, function() {
            updateStatusLabel(isEnabled);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: "TOGGLE_UPDATE",
                        value: isEnabled
                    });
                }
            });
        });
    });

    // Функция для обновления текста метки
    function updateStatusLabel(isEnabled) {
        statusLabel.textContent = isEnabled
            ? 'Popup включён'
            : 'Popup выключен';
        statusLabel.style.color = isEnabled ? 'green' : 'red';

    }
});