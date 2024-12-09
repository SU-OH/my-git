import cv2
import mediapipe as mp
import numpy as np
import os
import sys
import json
from scipy.spatial.distance import cosine, euclidean
from scipy.spatial import procrustes
from datetime import datetime
from multiprocessing import Pool, cpu_count
import logging

# 설정: 로깅 설정
logging.basicConfig(
    filename='pose_analysis.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Mediapipe 설정 조정
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.8,
    min_tracking_confidence=0.7
)

# 프로젝트 루트 디렉토리를 기준으로 상대 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PROFESSIONAL_POSE_FOLDER = os.path.join(PROJECT_ROOT, 'professional_poses')

# 사용자 포즈 데이터 저장 폴더
USER_POSE_DATA_FOLDER = os.path.join(PROJECT_ROOT, 'user_pose_data')

# 사용할 랜드마크 인덱스 (얼굴 제외)
USED_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26]

def extract_landmarks_from_image(image):
    """이미지에서 상체 및 허벅지 랜드마크를 추출합니다."""
    try:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            selected_landmarks = [landmarks[idx] for idx in USED_LANDMARKS]
            landmark_array = np.array([[lm.x, lm.y, lm.z] for lm in selected_landmarks])
            return landmark_array
        else:
            logging.warning("포즈 랜드마크를 인식하지 못했습니다.")
            return None
    except Exception as e:
        logging.error(f"랜드마크 추출 중 오류 발생: {e}")
        return None

def normalize_pose(coords):
    """포즈를 정규화합니다."""
    try:
        left_shoulder = coords[0]
        right_shoulder = coords[1]
        head_top = (left_shoulder + right_shoulder) / 2 + np.array([0, -0.1, 0])

        coords_centered = coords - head_top
        max_dist = np.max(np.linalg.norm(coords_centered, axis=1))
        if max_dist > 0:
            coords_normalized = coords_centered / max_dist
        else:
            coords_normalized = coords_centered
        return coords_normalized
    except Exception as e:
        logging.error(f"포즈 정규화 중 오류 발생: {e}")
        return coords

def calculate_hip_flexion_angle(coords):
    """고관절의 접힘 각도를 계산합니다."""
    try:
        angles = []
        for side in ['left', 'right']:
            if side == 'left':
                shoulder = coords[0]
                hip = coords[6]
                knee = coords[8]
            else:
                shoulder = coords[1]
                hip = coords[7]
                knee = coords[9]

            upper_leg = hip - shoulder
            lower_leg = knee - hip

            norm_upper = np.linalg.norm(upper_leg)
            norm_lower = np.linalg.norm(lower_leg)
            if norm_upper == 0 or norm_lower == 0:
                angle_deg = 0
                logging.warning(f"{side}쪽 다리 벡터 길이가 0입니다.")
            else:
                unit_upper = upper_leg / norm_upper
                unit_lower = lower_leg / norm_lower
                angle = np.arccos(np.clip(np.dot(unit_upper, unit_lower), -1.0, 1.0))
                angle_deg = np.degrees(angle)
            angles.append(angle_deg)

        average_angle = np.mean(angles)
        return average_angle
    except Exception as e:
        logging.error(f"고관절 접힘 각도 계산 중 오류 발생: {e}")
        return 0

def calculate_relative_positions(coords):
    """머리, 어깨, 무릎의 상대적 위치를 계산합니다."""
    try:
        left_shoulder = coords[0]
        right_shoulder = coords[1]
        head_top = (left_shoulder + right_shoulder) / 2 + np.array([0, -0.1, 0])

        left_knee = coords[8]
        right_knee = coords[9]

        left_distance = np.linalg.norm(left_shoulder - left_knee)
        right_distance = np.linalg.norm(right_shoulder - right_knee)

        relative_head_shoulder = np.linalg.norm(head_top - left_shoulder) + np.linalg.norm(head_top - right_shoulder)
        relative_shoulder_knee = left_distance + right_distance

        return relative_head_shoulder, relative_shoulder_knee
    except Exception as e:
        logging.error(f"상대적 위치 계산 중 오류 발생: {e}")
        return 0, 0

def calculate_wrist_relative_height(coords):
    """손목 위치와 팔의 상대적 높이를 계산합니다."""
    try:
        left_wrist = coords[4]
        right_wrist = coords[5]

        left_shoulder = coords[0]
        right_shoulder = coords[1]

        left_arm_height = left_shoulder[1] - left_wrist[1]
        right_arm_height = right_shoulder[1] - right_wrist[1]

        return left_arm_height, right_arm_height
    except Exception as e:
        logging.error(f"팔의 상대적 높이 계산 중 오류 발생: {e}")
        return 0, 0

def apply_procrustes(user_coords, standard_coords):
    """프로크루스테스 분석을 적용하여 포즈를 정렬합니다."""
    try:
        mtx1, mtx2, disparity = procrustes(standard_coords, user_coords)
        return mtx1, mtx2, disparity
    except Exception as e:
        logging.error(f"프로크루스테스 분석 중 오류 발생: {e}")
        return user_coords, standard_coords, None

def calculate_comprehensive_similarity(user_coords, standard_coords):
    """종합적인 포즈 유사도를 계산합니다."""
    try:
        cosine_sim = 1 - cosine(user_coords.flatten(), standard_coords.flatten())
        euclidean_dist = euclidean(user_coords.flatten(), standard_coords.flatten())
        euclidean_sim = 1 / (1 + euclidean_dist)
        base_similarity = (cosine_sim + euclidean_sim) / 2

        user_hip_angle = calculate_hip_flexion_angle(user_coords)
        standard_hip_angle = calculate_hip_flexion_angle(standard_coords)
        hip_angle_similarity = 1 / (1 + abs(user_hip_angle - standard_hip_angle) / 180)

        user_rel_head_shoulder, user_rel_shoulder_knee = calculate_relative_positions(user_coords)
        standard_rel_head_shoulder, standard_rel_shoulder_knee = calculate_relative_positions(standard_coords)
        rel_position_similarity = 1 / (1 + (abs(user_rel_head_shoulder - standard_rel_head_shoulder) + abs(user_rel_shoulder_knee - standard_rel_shoulder_knee)) / 100)

        user_left_arm_height, user_right_arm_height = calculate_wrist_relative_height(user_coords)
        standard_left_arm_height, standard_right_arm_height = calculate_wrist_relative_height(standard_coords)
        arm_height_similarity = 1 / (1 + (abs(user_left_arm_height - standard_left_arm_height) + abs(user_right_arm_height - standard_right_arm_height)) / 100)

        weights = {
            'base_similarity': 0.4,
            'hip_angle_similarity': 0.2,
            'rel_position_similarity': 0.2,
            'arm_height_similarity': 0.2
        }

        final_similarity = (
            weights['base_similarity'] * base_similarity +
            weights['hip_angle_similarity'] * hip_angle_similarity +
            weights['rel_position_similarity'] * rel_position_similarity +
            weights['arm_height_similarity'] * arm_height_similarity
        )

        comprehensive_similarities = {
            'base_similarity': base_similarity,
            'hip_angle_similarity': hip_angle_similarity,
            'rel_position_similarity': rel_position_similarity,
            'arm_height_similarity': arm_height_similarity
        }

        return final_similarity, comprehensive_similarities
    except Exception as e:
        logging.error(f"종합 유사도 계산 중 오류 발생: {e}")
        return 0, {}

def load_standard_poses():
    """기준 포즈를 로드하고 정규화합니다."""
    standard_poses = {}
    for idx in range(1, 7):
        pose_images = []
        for variation in range(1, 5):
            image_path = os.path.join(PROFESSIONAL_POSE_FOLDER, f'pose{idx}-{variation}.jpg')
            if not os.path.exists(image_path):
                logging.error(f"기준 이미지 파일이 존재하지 않습니다: {image_path}")
                continue
            image = cv2.imread(image_path)
            if image is None:
                logging.error(f"기준 이미지를 로드할 수 없습니다: {image_path}")
                continue
            coords = extract_landmarks_from_image(image)
            if coords is not None:
                coords = normalize_pose(coords)
                pose_images.append(coords)
            else:
                logging.warning(f"랜드마크를 추출할 수 없습니다: {image_path}")
        if pose_images:
            standard_poses[idx] = pose_images
        else:
            logging.error(f"포즈 {idx}에 대한 기준 이미지가 없습니다.")
    return standard_poses

def process_pose(args):
    """포즈별로 유사도 계산을 병렬 처리하기 위한 함수."""
    idx, user_coords, standard_coords_list, similarity_threshold, consecutive_required = args
    similarities = []
    comprehensive_similarities = []
    for standard_coords in standard_coords_list:
        sim, comp_sim = calculate_comprehensive_similarity(user_coords, standard_coords)
        similarities.append(sim)
        comprehensive_similarities.append(comp_sim)
    if similarities:
        max_similarity = max(similarities)
        max_index = similarities.index(max_similarity)
        average_similarity = max_similarity
        comprehensive_similarity = comprehensive_similarities[max_index]
        best_standard_coords = standard_coords_list[max_index]
    else:
        max_similarity = 0
        average_similarity = 0
        comprehensive_similarity = {}
        best_standard_coords = None
    return idx, similarities, average_similarity, max_similarity, comprehensive_similarity, best_standard_coords

# 사용자 자세에 대한 피드백 함수들 추가
def analyze_hip_flexion(user_coords, standard_coords):
    """고관절 각도 차이에 따른 피드백을 제공합니다."""
    user_hip_angle = calculate_hip_flexion_angle(user_coords)
    standard_hip_angle = calculate_hip_flexion_angle(standard_coords)

    # 구체적인 피드백: 각도 차이 비교
    angle_difference = user_hip_angle - standard_hip_angle
    if abs(angle_difference) < 5:
        return "고관절 각도가 적절합니다."
    elif angle_difference > 0:
        return (
            f"사용자의 고관절 각도가 기준보다 덜 구부려졌습니다. "
            f"고관절을 조금 더 접어 허리를 낮출 필요가 있습니다. "
            f"(현재 각도: {user_hip_angle:.2f}°, 기준 각도: {standard_hip_angle:.2f}°)"
        )
    else:
        return (
            f"사용자의 고관절 각도가 기준보다 많이 구부려졌습니다. "
            f"허리를 조금 더 펴는 것이 좋습니다. "
            f"(현재 각도: {user_hip_angle:.2f}°, 기준 각도: {standard_hip_angle:.2f}°)"
        )

def analyze_position_distance(user_coords, standard_coords):
    """어깨-머리 및 어깨-무릎 간 거리 차이에 따른 피드백을 제공합니다."""
    user_head_shoulder, user_shoulder_knee = calculate_relative_positions(user_coords)
    standard_head_shoulder, standard_shoulder_knee = calculate_relative_positions(standard_coords)

    feedback = []

    # 머리와 어깨 사이의 거리 비교
    if abs(user_head_shoulder - standard_head_shoulder) > 0.05:
        feedback.append(
            f"사용자의 머리와 어깨 사이의 거리가 기준보다 차이가 납니다. "
            f"머리와 어깨 사이의 균형을 맞춰 자세를 교정해야 합니다. "
            f"(현재 거리: {user_head_shoulder:.2f}, 기준 거리: {standard_head_shoulder:.2f})"
        )

    # 어깨와 무릎 사이의 거리 비교
    if abs(user_shoulder_knee - standard_shoulder_knee) > 0.05:
        feedback.append(
            f"사용자의 어깨와 무릎 사이의 거리가 기준보다 차이가 납니다. "
            f"무릎을 더 구부리거나 펴서 상체와 하체의 균형을 맞출 필요가 있습니다. "
            f"(현재 거리: {user_shoulder_knee:.2f}, 기준 거리: {standard_shoulder_knee:.2f})"
        )

    return " ".join(feedback) if feedback else "상대적 위치가 적절합니다."

def analyze_arm_height(user_coords, standard_coords):
    """팔 높이 차이에 따른 피드백을 제공합니다."""
    user_left_arm_height, user_right_arm_height = calculate_wrist_relative_height(user_coords)
    standard_left_arm_height, standard_right_arm_height = calculate_wrist_relative_height(standard_coords)

    feedback = []

    # 왼쪽 팔과 오른쪽 팔의 높이 비교
    if abs(user_left_arm_height - standard_left_arm_height) > 0.05:
        feedback.append(
            f"사용자의 왼쪽 팔 높이가 기준보다 차이가 납니다. "
            f"왼쪽 팔을 조금 더 들어올리거나 내려 균형을 맞추세요. "
            f"(현재 높이: {user_left_arm_height:.2f}, 기준 높이: {standard_left_arm_height:.2f})"
        )
    if abs(user_right_arm_height - standard_right_arm_height) > 0.05:
        feedback.append(
            f"사용자의 오른쪽 팔 높이가 기준보다 차이가 납니다. "
            f"오른쪽 팔을 조금 더 들어올리거나 내려 균형을 맞추세요. "
            f"(현재 높이: {user_right_arm_height:.2f}, 기준 높이: {standard_right_arm_height:.2f})"
        )

    return " ".join(feedback) if feedback else "팔 높이가 적절합니다."

def analyze_user_video(video_file, user_id):
    """사용자 동영상을 분석하여 피드백을 제공합니다."""
    standard_poses = load_standard_poses()
    if not standard_poses:
        logging.error("기준 포즈를 로드할 수 없습니다.")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_folder = os.path.join(USER_POSE_DATA_FOLDER, f"{user_id}_{timestamp}")
    os.makedirs(save_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_file)
    if not cap.isOpened():
        logging.error("동영상을 열 수 없습니다.")
        sys.exit(1)

    frame_count = 0
    pose_similarities = {
        idx: {
            "similarity_sum": 0,
            "average_similarity": 0,
            "frame": None,
            "max_similarity_sum": 0,
            "max_frame": None,
            "individual_similarities": [],
            "comprehensive_similarities": {},
            "user_coords": None,
            "best_standard_coords": None,
            "user_coords_max": None,
            "best_standard_coords_max": None
        } for idx in standard_poses.keys()
    }
    pose_consecutive_counts = {idx: 0 for idx in standard_poses.keys()}

    similarity_threshold = 0.8
    consecutive_required = 3

    pool = Pool(processes=min(cpu_count(), 6))

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            landmarks = extract_landmarks_from_image(frame)
            if landmarks is not None:
                normalized_landmarks = normalize_pose(landmarks)
                tasks = []
                for idx, standard_coords_list in standard_poses.items():
                    tasks.append((idx, normalized_landmarks, standard_coords_list, similarity_threshold, consecutive_required))
                results = pool.map(process_pose, tasks)

                for result in results:
                    idx, similarities, average_similarity, max_similarity, comprehensive_similarity, best_standard_coords = result
                    pose_similarities[idx]["individual_similarities"] = similarities
                    pose_similarities[idx]["comprehensive_similarities"] = comprehensive_similarity

                    if max_similarity > pose_similarities[idx]["max_similarity_sum"]:
                        pose_similarities[idx]["max_similarity_sum"] = max_similarity
                        pose_similarities[idx]["max_frame"] = frame.copy()
                        pose_similarities[idx]["user_coords_max"] = normalized_landmarks
                        pose_similarities[idx]["best_standard_coords_max"] = best_standard_coords

                    if average_similarity >= similarity_threshold:
                        pose_consecutive_counts[idx] += 1
                        if pose_consecutive_counts[idx] >= consecutive_required:
                            if max_similarity > pose_similarities[idx]["similarity_sum"]:
                                pose_similarities[idx]["similarity_sum"] = max_similarity
                                pose_similarities[idx]["average_similarity"] = average_similarity
                                pose_similarities[idx]["frame"] = frame.copy()
                                pose_similarities[idx]["user_coords"] = normalized_landmarks
                                pose_similarities[idx]["best_standard_coords"] = best_standard_coords
                    else:
                        pose_consecutive_counts[idx] = 0
    except Exception as e:
        logging.error(f"영상 분석 중 오류 발생: {e}")
    finally:
        cap.release()
        pool.close()
        pool.join()

    # 결과 준비
    comments = {}
    for idx, data in pose_similarities.items():
        average_similarity = data.get("average_similarity", 0)
        frame = data.get("frame", None)
        individual_similarities = data.get("individual_similarities", [])
        comprehensive_similarities = data.get("comprehensive_similarities", {})
        similarity_percentage = f"{average_similarity * 100:.2f}%" if average_similarity > 0 else "0.00%"

        if frame is None:
            frame = data.get("max_frame", None)
            user_coords = data.get("user_coords_max")
            best_standard_coords = data.get("best_standard_coords_max")
            if frame is not None:
                similarity_sum = data.get("max_similarity_sum", 0)
                pose_count = len(standard_poses[idx])
                if pose_count > 0:
                    average_similarity = similarity_sum / pose_count
                    similarity_percentage = f"{average_similarity * 100:.2f}%"
                else:
                    average_similarity = 0
                    similarity_percentage = "0.00%"
                    logging.warning(f"standard_poses[{idx}]의 포즈 수가 0입니다. average_similarity를 0으로 설정합니다.")
        else:
            user_coords = data.get("user_coords")
            best_standard_coords = data.get("best_standard_coords")

        if frame is not None:
            image_filename = f"user_pose_{idx}_{timestamp}.jpg"
            image_path = os.path.join(save_folder, image_filename)
            cv2.imwrite(image_path, frame)

            similarities = data["individual_similarities"]
            max_similarity = data["max_similarity_sum"]
            try:
                max_variation = similarities.index(max_similarity) + 1
                if max_variation > 4:
                    max_variation = 1
            except ValueError:
                max_variation = 1
                logging.warning(f"포즈 {idx}의 최대 유사도 변형을 찾을 수 없습니다. 기본값 1을 사용합니다.")

            pro_image_path = os.path.join(PROFESSIONAL_POSE_FOLDER, f'pose{idx}-{max_variation}.jpg')

            # 사용자 자세에 대한 피드백 생성
            feedback = []
            if user_coords is not None and best_standard_coords is not None:
                feedback.append(analyze_hip_flexion(user_coords, best_standard_coords))
                feedback.append(analyze_position_distance(user_coords, best_standard_coords))
                feedback.append(analyze_arm_height(user_coords, best_standard_coords))
                feedback_text = " ".join(feedback)
            else:
                feedback_text = "자세 분석을 위한 데이터가 충분하지 않습니다."

            comments[f"포즈 {idx}"] = {
                "user_image": f"/user_pose_data/{user_id}_{timestamp}/{image_filename}",
                "similarity": similarity_percentage,
                "feedback": feedback_text,
                "professional_image": f"/professional_poses/pose{idx}-{max_variation}.jpg"
            }
        else:
            comments[f"포즈 {idx}"] = {
                "user_image": None,
                "similarity": "0.00%",
                "feedback": "포즈를 인식하지 못했습니다.",
                "professional_image": f"/professional_poses/pose{idx}-1.jpg"
            }

    try:
        print(json.dumps(comments, ensure_ascii=False, indent=4))
    except Exception as e:
        logging.error(f"JSON 변환 중 오류 발생: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용법: python bowling_pose_analysis.py <video_path> <user_id>", file=sys.stderr)
        sys.exit(1)
    VIDEO_FILE = sys.argv[1]
    USER_ID = sys.argv[2]
    analyze_user_video(VIDEO_FILE, USER_ID)
