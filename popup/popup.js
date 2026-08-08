document.addEventListener('DOMContentLoaded', function () {
    const routeForm = document.getElementById('routeForm');
    const findRouteButton = document.getElementById('findRouteButton');
    const numberDestinationsInput = document.getElementById('numberDestinations');
    const fixedStartCheckbox = document.getElementById('fixedStart');
    const fixedEndCheckbox = document.getElementById('fixedEnd');
    const statusMessage = document.getElementById('statusMessage');

    if (!routeForm || !findRouteButton || !numberDestinationsInput || !statusMessage) {
        return;
    }

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.classList.toggle('is-error', Boolean(isError));
    }

    routeForm.addEventListener('submit', function (event) {
        event.preventDefault();
        setStatus('');

        const numberDestinations = Number.parseInt(numberDestinationsInput.value, 10);
        if (!Number.isInteger(numberDestinations) || numberDestinations < 3 || numberDestinations > 20) {
            setStatus('Please enter a valid number of destinations between 3 and 20.', true);
            return;
        }

        findRouteButton.disabled = true;
        findRouteButton.textContent = 'Working...';

        const payload = {
            action: 'setWaypointPlan',
            numberDestinations,
            fixedStart: Boolean(fixedStartCheckbox?.checked),
            fixedEnd: Boolean(fixedEndCheckbox?.checked)
        };

        console.log('[FindMyWay] Sending route request', payload);

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            if (!activeTab || typeof activeTab.id !== 'number') {
                setStatus('Open Google Maps first and try again.', true);
                findRouteButton.disabled = false;
                findRouteButton.textContent = 'Find Route';
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, payload, function (response) {
                if (chrome.runtime.lastError) {
                    setStatus('Google Maps did not respond. Please refresh the tab and try again.', true);
                    findRouteButton.disabled = false;
                    findRouteButton.textContent = 'Find Route';
                    return;
                }

                console.log('[FindMyWay] Received route response', response);

                if (response?.success) {
                    const collectedCount = response?.plan?.collectedCount ?? response?.plan?.locations?.length ?? 0;
                    setStatus(`Route plan ready for ${numberDestinations} destinations. Collected ${collectedCount} location${collectedCount === 1 ? '' : 's'}.`);
                    window.setTimeout(function () {
                        window.close();
                    }, 600);
                    return;
                }

                setStatus(response?.error || 'Something went wrong. Please try again.', true);
                findRouteButton.disabled = false;
                findRouteButton.textContent = 'Find Route';
            });
        });
    });
});