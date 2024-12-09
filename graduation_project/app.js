const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const { exec } = require('child_process');

// Firebase Admin SDK 초기화
const serviceAccount = require("./firebase-service-account.json"); // 서비스 계정 키 파일 경로
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 설정
app.use('/professional_poses', express.static(path.join(__dirname, 'professional_poses')));
app.use('/user_pose_data', express.static(path.join(__dirname, 'user_pose_data')));

// Upload directory settings
const userFilesDirectory = path.join(__dirname, "uploads", "userFiles");
const mainFilesDirectory = path.join(__dirname, "uploads", "mainFiles");
const userPoseDataDirectory = path.join(__dirname, "user_pose_data");

if (!fs.existsSync(userFilesDirectory)) {
  fs.mkdirSync(userFilesDirectory, { recursive: true });
}
if (!fs.existsSync(mainFilesDirectory)) {
  fs.mkdirSync(mainFilesDirectory, { recursive: true });
}
if (!fs.existsSync(userPoseDataDirectory)) {
  fs.mkdirSync(userPoseDataDirectory, { recursive: true });
}

// Admin password file path and initial password
const adminPasswordPath = path.join(__dirname, "adminPassword.json");
let adminPassword = "0000"; // Default password
if (fs.existsSync(adminPasswordPath)) {
  const data = fs.readFileSync(adminPasswordPath, "utf8");
  adminPassword = JSON.parse(data).password;
} else {
  fs.writeFileSync(
    adminPasswordPath,
    JSON.stringify({ password: adminPassword })
  );
}

// Multer settings for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "mainFile") {
      cb(null, mainFilesDirectory);
    } else {
      cb(null, userFilesDirectory);
    }
  },
  filename: function (req, file, cb) {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, fileId + extension);
  },
});

const upload = multer({ storage: storage });

// 홈 페이지
app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>볼링자세 분석</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background-color: #f9f9f9;
          position: relative;
        }
        h1 {
          text-align: center;
        }
        form {
          margin-bottom: 20px;
        }
        input[type="file"] {
          margin-bottom: 10px;
        }
        input[type="text"] {
          padding: 8px;
          width: 200px;
          margin-bottom: 10px;
        }
        button {
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: #45a049;
        }
        .home-btn {
          display: block;
          text-align: center;
          margin-top: 20px;
          text-decoration: none;
          background-color: #008CBA;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
        }
        .home-btn:hover {
          background-color: #005580;
        }
        /* 로딩 애니메이션 스타일 추가 */
        #loadingModal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
        }
        #loadingModal .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          text-align: center;
        }
        .loader {
          border: 16px solid #f3f3f3;
          border-top: 16px solid #3498db;
          border-radius: 50%;
          width: 120px;
          height: 120px;
          animation: spin 2s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>볼링자세 분석</h1>
        <form id="uploadForm" enctype="multipart/form-data">
          <input type="file" name="video" accept=".mp4, .avi, .mpeg" required>
          <br>
          <input type="text" name="userId" placeholder="회원 ID" required>
          <br>
          <button type="submit">분석하기</button>
        </form>
        <a href="/history" class="home-btn">업로드 히스토리</a>
      </div>

      <!-- 로딩 모달 추가 -->
      <div id="loadingModal">
        <div class="modal-content">
          <div class="loader"></div>
          <p>분석 중입니다. 이 작업은 1분가량 소요됩니다.</p>
        </div>
      </div>

      <script>
        document.getElementById('uploadForm').addEventListener('submit', function(event) {
          event.preventDefault();

          // 로딩 모달 표시
          document.getElementById('loadingModal').style.display = 'block';

          var formData = new FormData(this);

          fetch('/analyze', {
            method: 'POST',
            body: formData
          })
          .then(response => response.text())
          .then(data => {
            // 로딩 모달 숨김
            document.getElementById('loadingModal').style.display = 'none';
            // 결과 페이지로 이동 또는 결과 표시
            document.open();
            document.write(data);
            document.close();
          })
          .catch(error => {
            console.error('Error:', error);
            document.getElementById('loadingModal').style.display = 'none';
            alert('분석 중 오류가 발생했습니다.');
          });
        });
      </script>
    </body>
    </html>
  `);
});

// 분석 페이지
app.post("/analyze", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.send("영상 파일을 첨부해주세요.");
  }

  const uploadTime = new Date().toLocaleString();
  const fileSize = (req.file.size / 1024).toFixed(2) + " KB";
  const userId = req.body.userId;

  // 비디오 파일의 절대 경로를 생성
  const videoPath = path.resolve(req.file.path);

  const videoData = {
    uploadTime: uploadTime,
    fileName: req.file.filename,
    fileSize: fileSize,
    userId: userId,
    videoPath: videoPath,
  };

  // Firestore에 업로드 정보 추가
  const videoDocRef = await db.collection("videoUploads").add(videoData);

  // Python 스크립트를 사용하여 실제 분석을 수행하도록 호출
  const normalizedVideoPath = path.normalize(videoData.videoPath);
  exec(
    `python bowling_pose_analysis.py "${normalizedVideoPath}" "${userId}"`,
    async (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        console.error(`stderr: ${stderr}`);
        return res.send("분석 중 오류가 발생했습니다.");
      }

      try {
        // stdout에서 JSON 부분만 추출
        const jsonStartIndex = stdout.indexOf('{');
        const jsonEndIndex = stdout.lastIndexOf('}');
        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          throw new Error('Python 스크립트 출력에서 JSON 데이터를 찾을 수 없습니다.');
        }
        const jsonString = stdout.substring(jsonStartIndex, jsonEndIndex + 1);

        const analysisResult = JSON.parse(jsonString);

        console.log("Analysis Result:", analysisResult);

        // Firestore에 분석 결과 추가
        await videoDocRef.update({ analysisResult: analysisResult });

        // 분석 결과를 HTML로 렌더링
        let resultHtml = `
          <html>
          <head>
            <title>분석 결과</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 1200px;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 8px;
                background-color: #fff;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              h1 {
                text-align: center;
                color: #333;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: center;
              }
              th {
                background-color: #f2f2f2;
              }
              img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
              }
              .home-btn {
                display: block;
                text-align: center;
                margin-top: 20px;
                background-color: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                text-decoration: none;
              }
              .home-btn:hover {
                background-color: #218838;
              }
              .corrections {
                text-align: left;
                padding: 10px;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>분석 결과</h1>

              <!-- 사용자 영상 재생 추가 -->
              <div style="text-align: center; margin-bottom: 20px;">
                <video controls width="800">
                  <source src="/video/${videoData.fileName}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
              </div>

              <table>
                <tr>
                  <th>포즈</th>
                  <th>비슷한 프레임</th>
                  <th>유사도</th>
                  <th>기준 포즈</th>
                </tr>
        `;

        // 6개의 포즈에 대해 비교 결과 추가
        for (let i = 1; i <= 6; i++) {
          const poseKey = `포즈 ${i}`;
          const poseData = analysisResult[poseKey];

          if (poseData && poseData.user_image) {
            resultHtml += `
              <tr>
                <td>포즈 ${i}</td>
                <td><img src="${poseData.user_image}" alt="사용자 포즈 ${i}" onerror="this.onerror=null; this.src='/professional_poses/default_image.jpg'"></td>
                <td>${poseData.similarity}</td>
                <td><img src="${poseData.professional_image}" alt="선수 포즈 ${i}"></td>
              </tr>
              <tr>
                <td colspan="4">
                  <strong>수정 필요 사항:</strong> ${poseData.feedback || '분석 결과가 없습니다.'}
                </td>
              </tr>
            `;
          } else {
            resultHtml += `
              <tr>
                <td>포즈 ${i}</td>
                <td colspan="2">포즈를 찾을 수 없습니다.</td>
                <td><img src="/professional_poses/pose${i}-1.jpg" alt="선수 포즈 ${i}"></td>
              </tr>
              <tr>
                <td colspan="4">
                  <strong>수정 필요 사항:</strong> 포즈를 인식하지 못했습니다.
                </td>
              </tr>
            `;
          }
        }

        resultHtml += `
              </table>
              <a href="/viewHistory?userId=${userId}" class="home-btn">돌아가기</a>
            </div>
          </body>
          </html>
        `;

        res.send(resultHtml);
      } catch (parseError) {
        console.error(`Parsing error: ${parseError}`);
        res.send("분석 결과를 처리하는 중 오류가 발생했습니다.");
      }
    }
  );
});

// 업로드 히스토리 페이지
app.get("/history", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>업로드 히스토리</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        h1 {
          text-align: center;
        }
        form {
          margin-bottom: 20px;
          text-align: center;
        }
        input[type="text"] {
          padding: 8px;
          width: 200px;
          margin-right: 10px;
        }
        button {
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: #45a049;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          margin-bottom: 10px;
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .home-btn {
          display: block;
          margin-top: 20px;
          text-decoration: none;
          background-color: #008CBA;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
        }
        .home-btn:hover {
          background-color: #005580;
        }
        .result-link {
          margin-left: 10px;
          color: #007BFF;
          text-decoration: none;
        }
        .result-link:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>업로드 히스토리</h1>
        <form action="/viewHistory" method="get">
          <input type="text" name="userId" placeholder="회원 ID" required>
          <button type="submit">조회하기</button>
        </form>
        <a href="/" class="home-btn">HOME으로 돌아가기</a>
      </div>
    </body>
    </html>
  `);
});

// 회원별 업로드 히스토리 조회
app.get("/viewHistory", async (req, res) => {
  const userId = req.query.userId;

  const filteredHistory = [];
  const snapshot = await db
    .collection("videoUploads")
    .where("userId", "==", userId)
    .get();

  snapshot.forEach((doc) => {
    filteredHistory.push(doc.data());
  });

  if (filteredHistory.length === 0) {
    return res.send(`
      <html>
      <head>
        <title>업로드 히스토리</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #f9f9f9;
            text-align: center;
          }
          h1 {
            text-align: center;
          }
          .home-btn {
            display: block;
            margin-top: 20px;
            text-decoration: none;
            background-color: #008CBA;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
          }
          .home-btn:hover {
            background-color: #005580;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>업로드 히스토리</h1>
          <p>해당 회원 ID에 대한 업로드 기록이 없습니다.</p>
          <a href="/" class="home-btn">HOME으로 돌아가기</a>
        </div>
      </body>
      </html>
    `);
  }

  let historyHtml = `
    <html>
    <head>
      <title>업로드 히스토리</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        h1 {
          text-align: center;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          margin-bottom: 10px;
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .home-btn {
          display: block;
          margin-top: 20px;
          text-decoration: none;
          background-color: #008CBA;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
        }
        .home-btn:hover {
          background-color: #005580;
        }
        .result-link {
          margin-left: 10px;
          color: #007BFF;
          text-decoration: none;
        }
        .result-link:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>업로드 히스토리</h1>
        <ul>
  `;

  filteredHistory.forEach((entry) => {
    historyHtml += `
      <li>
        업로드 시간: ${entry.uploadTime}, 파일명: ${entry.fileName}, 파일 크기: ${entry.fileSize}
        <a href="/results/${entry.fileName}" class="result-link">분석 결과 보기</a>
      </li>
    `;
  });

  historyHtml += `
        </ul>
        <a href="/" class="home-btn">HOME으로 돌아가기</a>
      </div>
    </body>
    </html>
  `;

  res.send(historyHtml);
});

// 분석 결과 보기 페이지
app.get("/results/:fileName", async (req, res) => {
  const fileName = req.params.fileName;

  const snapshot = await db
    .collection("videoUploads")
    .where("fileName", "==", fileName)
    .get();

  if (!snapshot.empty) {
    const videoEntry = snapshot.docs[0].data();
    const userId = videoEntry.userId;

    if (videoEntry && videoEntry.analysisResult) {
      const analysisResult = videoEntry.analysisResult;

      // 분석 결과 페이지 HTML 생성
      let resultHtml = `
        <html>
        <head>
          <title>분석 결과</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 1200px;
              padding: 20px;
              border: 1px solid #ccc;
              border-radius: 8px;
              background-color: #fff;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1 {
              text-align: center;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: center;
            }
            th {
              background-color: #f2f2f2;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
            }
            .home-btn {
              display: block;
              text-align: center;
              margin-top: 20px;
              background-color: #28a745;
              color: white;
              padding: 10px 20px;
              border-radius: 4px;
              text-decoration: none;
            }
            .home-btn:hover {
              background-color: #218838;
            }
            .corrections {
              text-align: left;
              padding: 10px;
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>분석 결과</h1>

            <!-- 사용자 영상 재생 추가 -->
            <div style="text-align: center; margin-bottom: 20px;">
              <video controls width="800">
                <source src="/video/${videoEntry.fileName}" type="video/mp4">
                Your browser does not support the video tag.
              </video>
            </div>

            <table>
              <tr>
                <th>포즈</th>
                <th>비슷한 프레임</th>
                <th>유사도</th>
                <th>기준 포즈</th>
              </tr>
      `;

      // 6개의 포즈에 대해 비교 결과 추가
      for (let i = 1; i <= 6; i++) {
        const poseKey = `포즈 ${i}`;
        const poseData = analysisResult[poseKey];

        if (poseData && poseData.user_image) {
          resultHtml += `
            <tr>
              <td>포즈 ${i}</td>
              <td><img src="${poseData.user_image}" alt="사용자 포즈 ${i}" onerror="this.onerror=null; this.src='/professional_poses/default_image.jpg'"></td>
              <td>${poseData.similarity}</td>
              <td><img src="${poseData.professional_image}" alt="선수 포즈 ${i}"></td>
            </tr>
            <tr>
              <td colspan="4">
                <strong>수정 필요 사항:</strong> ${poseData.feedback || '분석 결과가 없습니다.'}
              </td>
            </tr>
          `;
        } else {
          resultHtml += `
            <tr>
              <td>포즈 ${i}</td>
              <td colspan="2">포즈를 찾을 수 없습니다.</td>
              <td><img src="/professional_poses/pose${i}-1.jpg" alt="선수 포즈 ${i}"></td>
            </tr>
            <tr>
              <td colspan="4">
                <strong>수정 필요 사항:</strong> 포즈를 인식하지 못했습니다.
              </td>
            </tr>
          `;
        }
      }

      resultHtml += `
            </table>
            <a href="/viewHistory?userId=${userId}" class="home-btn">돌아가기</a>
          </div>
        </body>
        </html>
      `;
      res.send(resultHtml);
    } else {
      res.status(404).send("분석 결과를 찾을 수 없습니다.");
    }
  } else {
    res.status(404).send("분석 결과를 찾을 수 없습니다.");
  }
});

// 영상 보기 페이지
app.get("/video/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "uploads", "userFiles", fileName);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("영상을 찾을 수 없습니다.");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});