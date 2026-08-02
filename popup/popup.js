document.addEventListener('DOMContentLoaded', function () {
    const findRouteButton = document.getElementById('findRouteButton');
    const numberDestinationsInput = document.getElementById('numberDestinations');

    if (!findRouteButton || !numberDestinationsInput) {
        return;
    }

    findRouteButton.addEventListener('click', function () {
        const numberDestinations = Number.parseInt(numberDestinationsInput.value, 10);

        if (!Number.isInteger(numberDestinations) || numberDestinations < 3 || numberDestinations > 20) {
            alert('Please enter a valid number of destinations between 3 and 20.');
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            if (!activeTab || typeof activeTab.id !== 'number') {
                alert('Open Google Maps first and try again.');
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, {
                action: 'setWaypointPlan',
                numberDestinations
            }, function (response) {
                if (chrome.runtime.lastError) {
                    alert('Open Google Maps first and try again.');
                    return;
                }

                if (response?.success) {
                    window.close();
                }
            });
        });
    });
});