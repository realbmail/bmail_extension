function showView(hash, callback) {
    const views = document.querySelectorAll('.page_view');
    views.forEach(view => view.style.display = 'none');

    const id = hash.replace('#onboarding/', 'view-');
    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
    }
    if(callback){
        callback(hash);
    }
}