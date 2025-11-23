// 프로필 사진 업로드
document.addEventListener('DOMContentLoaded', function() {
    const profileUpload = document.getElementById('profileUpload');
    const profileImage = document.getElementById('profileImage');

    profileUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();

            reader.onload = function(event) {
                profileImage.src = event.target.result;
            }

            reader.readAsDataURL(e.target.files[0]);
        }
    });
});