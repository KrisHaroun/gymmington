document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);

    const manufacturerParam = urlParams.get('manufacturer');
    if (manufacturerParam) {
        const manufacturers = manufacturerParam.split(',');
        const manufacturerCheckboxes = document.getElementsByName('manufacturer');
        for (const checkbox of manufacturerCheckboxes) {
            if (manufacturers.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        }
    }

    const priceParam = urlParams.get('price');
    if (priceParam) {
        const [minPrice, maxPrice] = priceParam.split('-');
        document.getElementById('minPrice').value = minPrice || '';
        document.getElementById('maxPrice').value = maxPrice || '';
    }

    document.getElementById('filterForm').addEventListener('submit', function(event) {
        event.preventDefault();
        updateUrl();
    });

    window.changePage = function(page) {
        document.getElementById('page').value = page;
        updateUrl();
    };

    function updateUrl() {
        const manufacturerCheckboxes = document.getElementsByName('manufacturer');
        const manufacturers = [];

        manufacturerCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                manufacturers.push(checkbox.value);
            }
        });

        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        const page = document.getElementById('page').value;

        const queryParams = new URLSearchParams();
        if (page) {
            queryParams.append('page', parseInt(page));
        }
        if (manufacturers.length > 0) {
            queryParams.append('manufacturer', manufacturers.join(','));
        }
        if (minPrice && maxPrice) {
            queryParams.append('price', `${minPrice}-${maxPrice}`);
        }

        const queryString = queryParams.toString();
        const newUrl = `?${queryString}`;

        window.location.href = newUrl;
    }
});
