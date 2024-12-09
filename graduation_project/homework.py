import numpy as np
import matplotlib.pyplot as plt
from matplotlib import font_manager, rc

font_path = r"C:\Windows\Fonts\gulim.ttc"

font_name = font_manager.FontProperties(fname=font_path).get_name()
rc('font', family=font_name)

m = 2  # 질량 (kg)
F_thr = 1  # 추력 입력값 (N)
a = F_thr / m  # 가속도 (m/s^2)
t_sim = 10  # 시뮬레이션 시간 (초)
dt = 0.01  # 시간 간격 (초)

t = np.arange(0, t_sim + dt, dt)

# 위치, 속도, 가속도 계산
position = 0.5 * a * t**2  
velocity = a * t  
acceleration = np.full_like(t, a)  

# 그래프 1: 시간 vs 위치
plt.figure()
plt.plot(t, position)
plt.title('시간(sec) - 위치(m)')
plt.xlabel('시간 (sec)')
plt.ylabel('위치 (m)')
plt.grid(True)
plt.show()

# 그래프 2: 시간 vs 속도
plt.figure()
plt.plot(t, velocity)
plt.title('시간(sec) - 속도(m/s)')
plt.xlabel('시간 (sec)')
plt.ylabel('속도 (m/s)')
plt.grid(True)
plt.show()

# 그래프 3: 시간 vs 가속도
plt.figure()
plt.plot(t, acceleration)
plt.title('시간(sec) - 가속도(m/s^2)')
plt.xlabel('시간 (sec)')
plt.ylabel('가속도 (m/s^2)')
plt.grid(True)
plt.show()
