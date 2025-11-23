function certifyPhone() {
    IMP.init("YOUR_IMP_UID");   // ★ 본인 포트원 가맹점 식별코드

    IMP.certification(
        {
            merchant_uid: "cert_" + new Date().getTime()
        },
        function (rsp) {
            if (rsp.success) {
                // 서버에 인증 imp_uid 검증 요청
                fetch("/verify_phone_cert/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imp_uid: rsp.imp_uid })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.verified) {
                        document.querySelector("input[name='phone']").value = data.phone;
                        alert("본인 인증 성공! 전화번호가 자동 입력되었습니다.");
                    } else {
                        alert("본인 인증 검증 실패");
                    }
                });
            } else {
                alert("본인 인증 실패: " + rsp.error_msg);
            }
        }
    );
}

// 프로필 이미지 업로드 기능
document.addEventListener('DOMContentLoaded', function() {
    const profileUpload = document.getElementById('profileUpload');
    const profileImage = document.getElementById('profileImage');
    const deleteImageFlag = document.getElementById('deleteImageFlag');
    const deleteProfileImage = document.getElementById('deleteProfileImage');

    profileUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            // ★ 새 이미지를 업로드하면 "삭제 플래그"를 해제해서
            //    삭제 후 재업로드 시 새 이미지가 저장되도록 함
            deleteImageFlag.value = 'false';

            const reader = new FileReader();

            reader.onload = function(event) {
                profileImage.src = event.target.result;

                // 삭제 버튼 표시
                let existingDeleteBtn = document.getElementById('deleteProfileImage');
                if (!existingDeleteBtn) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.id = 'deleteProfileImage';
                    deleteBtn.className = 'btn btn-danger btn-sm position-absolute top-0 end-0 mt-1 me-1';
                    deleteBtn.style = 'width: 24px; height: 24px; padding: 0; border-radius: 50%;';
                    deleteBtn.innerHTML = '<i class="bi bi-x" style="font-size: 12px;"></i>';
                    deleteBtn.addEventListener('click', deleteImage);
                    profileImage.parentElement.parentElement.appendChild(deleteBtn);
                }
            };

            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // 이미지 삭제 함수
    function deleteImage() {
        profileImage.src = 'https://prs.ohousecdn.com/apne2/user/images/user-profile/v1-438811778732160.png';
        deleteImageFlag.value = 'true';

        // 파일 input 초기화
        profileUpload.value = '';

        // 삭제 버튼 제거
        const deleteBtn = document.getElementById('deleteProfileImage');
        if (deleteBtn) {
            deleteBtn.remove();
        }
    }

    // 삭제 버튼 이벤트 리스너
    if (deleteProfileImage) {
        deleteProfileImage.addEventListener('click', deleteImage);
    }
});
