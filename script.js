const version = 1 ;
const current = new Date()

const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
const liCode = (id,data,displayDate=false) =>
`<li class="list-group-item d-flex justify-content-between align-items-center">
    <div>
    ${ displayDate ? data.date.toLocaleString('fr-FR', options) : ''}
    ${ data.checked ? '<s>' : '' } ${categories[data.category]} | ${data.content} ${ data.checked ? '</s>' : '' }
    </div>
    <div class="btn-toolbar d-none" role="toolbar" aria-label="Toolbar with button groups">
        <div class="btn-group" role="group" aria-label="First group">
            <button type="button" class="btn btn-success btn-sm" data-action="btnAction" data-id="${id}" data-role="check">🗸</button>
            <input type="date" class="form-control d-none" id="datePicker-${id}">
            <button type="button" class="btn btn-warning btn-sm" data-action="btnAction" data-id="${id}" data-role="prog">📅</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="btnAction" data-id="${id}" data-role="delete">🗑️</button>
        </div>
    </div>
</li>` ;

const categories = []
categories["default"] = "❔"
categories["mail"] = "📧"
categories["shop"] = "🛍️"
categories["work"] = "💻"
categories["rdv"] = "📅"
categories["call"] = "📞"

addInput.addEventListener("keydown", event => {
    if(event.key == "Enter"){
        add(addInput.value)
        addInput.value = ""
        updatePage()
    }
})

async function init() {
    let db = await idb.openDB('todo', version , { upgrade(db) {
        let obj = db.createObjectStore('elements', { autoIncrement: true })
        obj.createIndex("date","date", { unique: false })
    }})
    db.close()

    updatePage()
}




async function add(data) {
    let db = await idb.openDB('todo', version , { upgrade(db) {
        db.createObjectStore('elements', { autoIncrement: true })
    }})
    data = data.includes(':') && data.split(':')[0] in categories ? data.split(':',2) : ["default",data]
    await db.add('elements', { content: data[1] , date: current , category : data[0] , checked : false })

    db.close()
}

async function checkItemFromId(id) {
    let db = await idb.openDB('todo', version )

    let res = await db.get('elements', id)
    await db.put('elements', { content: res.content , date: res.date , category : res.category , checked : !res.checked }, id)

    db.close()
}

async function changeDate(id,value) {
    let db = await idb.openDB('todo', version )

    let res = await db.get('elements', id)
    await db.put('elements', { content: res.content , date: new Date(value) , category : res.category , checked : res.checked }, id)

    db.close()
}


async function getAllData() {
    try {
        let db = await idb.openDB('todo', 1)

        let tx = db.transaction('elements', 'readonly')
        let store = tx.objectStore('elements')

        // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
        let allSavedItems = await store.getAll()
        let allSaveKeys = await store.getAllKeys()
        
        db.close()
        return [allSavedItems,allSaveKeys]
    } catch (error) {
        return []
    }
}

async function getData(id) {
    try {
        let db = await idb.openDB('todo', 1)

        let tx = db.transaction('elements', 'readonly')
        let store = tx.objectStore('elements')

        let SavedItems = await store.get(id)
        
        db.close()
        return SavedItems
    } catch (error) {
        return null
    }
}

async function getAllDataFromTo(lower, upper) {
    let db = await idb.openDB('todo', 1)

    let cursor = await db.transaction("elements").store.index("date").openKeyCursor(IDBKeyRange.bound(lower,upper));

    let allSavedItems = []
    let allSaveKeys = []

    while (cursor) {
        allSaveKeys.push(cursor.primaryKey)
        cursor = await cursor.continue();
    }

    for(let i = 0 ; i < allSaveKeys.length ; i++){
        allSavedItems.push(await getData(allSaveKeys[i]))
    }
    return [allSavedItems,allSaveKeys]
}


async function getAllDataForToday(){
    let lower = new Date()
    lower.setHours(0,0,0,0)
    let upper = new Date()
    upper.setHours(24,0,0,0)

    return await getAllDataFromTo(lower,upper)
}

async function getAllDataLate(){
    let lower = new Date()
    lower.setFullYear(lower.getFullYear()-1)
    let upper = new Date()
    upper.setHours(0,0,0,0)

    return await getAllDataFromTo(lower,upper)
}

async function getAllDataForNextDays(){
    let lower = new Date()
    lower.setHours(24,0,0,0)
    let upper = new Date()
    upper.setFullYear(upper.getFullYear()+1)

    return await getAllDataFromTo(lower,upper)
}

async function getCountForDays(day){
    let lower = new Date(day)
    lower.setHours(0,0,0,0)
    let upper = new Date(day)
    upper.setHours(24,0,0,0)

    let db = await idb.openDB('todo', 1)

    let cursor = await db.transaction("elements").store.index("date").openKeyCursor(IDBKeyRange.bound(lower,upper));

    let count=0

    while (cursor) {
        count++
        cursor = await cursor.continue();
    }
    return count
}

async function getCount() {
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readonly')
    let store = tx.objectStore('elements')

    // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
    let count = await store.count()
    
    db.close()
    return count
    } catch (error) {
        return -1
    }
}

async function deleteFromId(id){
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readwrite')
    let store = tx.objectStore('elements')

    let count = await store.delete(id)
    
    db.close()
    return count
    } catch (error) {
        return -1
    }
}

async function display() {
    const late = await getAllDataLate()
    const list = await getAllDataForToday()
    const nextDays = await getAllDataForNextDays()

    ulList.innerHTML = ''
    othersList.innerHTML = ''
    ulLate.innerHTML = ''

    updateAlert();
    updateTitle();

    late[0].forEach( (element,i) => {
        ulLate.innerHTML += liCode(late[1][i], element, true)
    });
    if(late[0].length===0){
        delayDiv.classList.add('d-none')
    }else{
        delayDiv.classList.remove('d-none')
    }

    list[0].forEach( (element,i) => {
        ulList.innerHTML += liCode(list[1][i], element)
    });

    nextDays[0].forEach( (element,i) => {
        othersList.innerHTML += liCode(nextDays[1][i], element, true)
    });


    items = document.querySelectorAll('li.list-group-item')
    items.forEach( item => {
        item.addEventListener( 'mouseover', event => {
            item.lastElementChild.classList.remove("d-none")
        })
        item.addEventListener( 'mouseleave', event => {
            item.lastElementChild.classList.add("d-none")
            item.children[1].children[0].children[1].classList.add("d-none")
        })
    })

    document.querySelectorAll("button[data-action=btnAction]").forEach( element => {
        element.addEventListener('click' ,async function (event) {
            const id = element.getAttribute('data-id')
            const role = element.getAttribute('data-role')
            if( role == "delete"){
                await deleteFromId(parseInt(id))
                updatePage()
            }
            else if( role == "check"){
                await checkItemFromId(parseInt(id))
                updatePage()
            }
            else if( role == "prog"){
                document.querySelector('#datePicker-'+parseInt(id)).classList.remove('d-none')
                document.querySelector('#datePicker-'+parseInt(id)).addEventListener('change', async event => {
                    await changeDate(parseInt(id),document.querySelector('#datePicker-'+parseInt(id)).value);
                    updatePage()
                
                })
            }
        
        })
    });

}

async function updateAlert() {
    const count = await getCountForDays(new Date());
    alertCount.innerText = count
    alertDiv.classList.remove('alert-primary','alert-success','alert-danger')
    alertDiv.classList.add(`alert-${count === 0 ? 'success' : 'danger'}`)

}

async function updateTitle() {
    const count = await getCountForDays(new Date());
    document.title = `To do (${count})`
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    date.innerText = new Date().toLocaleString('en-UK', options);
}

function updatePage() {
    displayDate()
    display()
}

function renderCategories(){
    for( c in categories){
        let li = document.createElement('li')
        li.innerText=categories[c]+" "+c
        catUl.append(li)
    }
}

init()
renderCategories()