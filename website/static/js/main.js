function showDirectory(data) {
    data = data['contents']
    document.getElementById('directory-data').innerHTML = ''
    const isTrash = getCurrentPath().startsWith('/trash')

    let html = ''

    // The data is already sorted by the server, so we just need to render it
    for (const [key, item] of Object.entries(data)) {
        if (item.type === 'folder') {
            html += `<tr data-path="${item.path}" data-id="${item.id}" data-name="${item.name}" class="body-tr folder-tr"><td><div class="td-align"><img src="static/assets/folder-solid-icon.svg">${item.name}</div></td><td><div class="td-align"></div></td><td><div class="td-align"><a data-id="${item.id}" class="more-btn"><img src="static/assets/more-icon.svg" class="rotate-90"></a></div></td></tr>`

            if (isTrash) {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="restore-${item.id}" data-path="${item.path}"><img src="static/assets/load-icon.svg"> Restore</div><hr><div id="delete-${item.id}" data-path="${item.path}"><img src="static/assets/trash-icon.svg"> Delete</div></div>`
            }
            else {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="rename-${item.id}"><img src="static/assets/pencil-icon.svg"> Rename</div><hr><div id="move-${item.id}"><img src="static/assets/upload-icon.svg"> Move</div><hr><div id="copy-${item.id}"><img src="static/assets/file-icon.svg"> Copy</div><hr><div id="trash-${item.id}"><img src="static/assets/trash-icon.svg"> Trash</div><hr><div id="folder-share-${item.id}"><img src="static/assets/share-icon.svg"> Share</div></div>`
            }
        } else if (item.type === 'file') {
            const size = convertBytes(item.size)
            html += `<tr data-path="${item.path}" data-id="${item.id}" data-name="${item.name}" class="body-tr file-tr"><td><div class="td-align"><img src="static/assets/file-icon.svg">${item.name}</div></td><td><div class="td-align">${size}</div></td><td><div class="td-align"><a data-id="${item.id}" class="more-btn"><img src="static/assets/more-icon.svg" class="rotate-90"></a></div></td></tr>`

            if (isTrash) {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="restore-${item.id}" data-path="${item.path}"><img src="static/assets/load-icon.svg"> Restore</div><hr><div id="delete-${item.id}" data-path="${item.path}"><img src="static/assets/trash-icon.svg"> Delete</div></div>`
            }
            else {
                html += `<div data-path="${item.path}" id="more-option-${item.id}" data-name="${item.name}" class="more-options"><input class="more-options-focus" readonly="readonly" style="height:0;width:0;border:none;position:absolute"><div id="rename-${item.id}"><img src="static/assets/pencil-icon.svg"> Rename</div><hr><div id="move-${item.id}"><img src="static/assets/upload-icon.svg"> Move</div><hr><div id="copy-${item.id}"><img src="static/assets/file-icon.svg"> Copy</div><hr><div id="trash-${item.id}"><img src="static/assets/trash-icon.svg"> Trash</div><hr><div id="share-${item.id}"><img src="static/assets/share-icon.svg"> Share</div></div>`
            }
        }
    }
    document.getElementById('directory-data').innerHTML = html

    if (!isTrash) {
        document.querySelectorAll('.folder-tr').forEach(div => {
            div.ondblclick = openFolder;
        });
        document.querySelectorAll('.file-tr').forEach(div => {
            div.ondblclick = openFile;
        });
    }

    document.querySelectorAll('.more-btn').forEach(div => {
        div.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation(); // Prevent row selection when clicking more button
            openMoreButton(div)
        });
    });

    // Update breadcrumb after showing directory
    if (window.updateBreadcrumb) {
        window.updateBreadcrumb();
    }
}

document.getElementById('search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = document.getElementById('file-search').value;
    console.log(query)
    if (query === '') {
        alert('Search field is empty');
        return;
    }
    const path = '/?path=/search_' + encodeURI(query);
    console.log(path)
    window.location = path;
});

// Loading Main Page

document.addEventListener('DOMContentLoaded', function () {
    const inputs = ['new-folder-name', 'rename-name', 'file-search']
    for (let i = 0; i < inputs.length; i++) {
        document.getElementById(inputs[i]).addEventListener('input', validateInput);
    }

    if (getCurrentPath().includes('/share_')) {
        getCurrentDirectoryWithSort()
    } else {
        if (getPassword() === null) {
            document.getElementById('bg-blur').style.zIndex = '2';
            document.getElementById('bg-blur').style.opacity = '0.1';

            document.getElementById('get-password').style.zIndex = '3';
            document.getElementById('get-password').style.opacity = '1';
        } else {
            getCurrentDirectoryWithSort()
        }
    }
});