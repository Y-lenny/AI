# 1. 监督 vs 无监督 —— 5小时搞定
# 理论：

# 监督学习：数据有标签（已知答案）。如：垃圾邮件分类（标签：是/否）

# 无监督学习：数据无标签，寻找结构。如：客户分群

# 监督：用鸢尾花数据集做分类
# import importlib


# try:
#     load_iris = importlib.import_module("sklearn.datasets").load_iris
#     DecisionTreeClassifier = importlib.import_module("sklearn.tree").DecisionTreeClassifier
#     KMeans = importlib.import_module("sklearn.cluster").KMeans
# except ModuleNotFoundError as exc:
#     raise ModuleNotFoundError(
#         "缺少依赖 scikit-learn。请先安装：python -m pip install scikit-learn"
#     ) from exc

# X, y = load_iris(return_X_y=True)
# clf = DecisionTreeClassifier().fit(X, y)
# print(clf.predict(X))

# # 无监督：用同一数据集做聚类（不用标签y）
# kmeans = KMeans(n_clusters=3).fit(X)
# print(kmeans.labels_)  # 看它分出的类是否和真实标签接近



# 2. 过拟合 —— 3小时理解 + 2小时实践
# 核心：模型死记硬背训练数据，但对新数据预测差。

import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

# 生成非线性数据：y = sin(2πx) + 噪声
np.random.seed(0)
X = np.linspace(0, 1, 30).reshape(-1, 1)
y = np.sin(2 * np.pi * X).ravel() + np.random.normal(0, 0.1, X.shape[0])

# 划分训练/测试
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 高阶多项式（degree=20）故意过拟合
poly = PolynomialFeatures(degree=20)
X_train_poly = poly.fit_transform(X_train)
X_test_poly = poly.transform(X_test)

model = LinearRegression()
model.fit(X_train_poly, y_train)

# 评估
y_train_pred = model.predict(X_train_poly)
y_test_pred = model.predict(X_test_poly)
print(f"训练 RMSE: {np.sqrt(mean_squared_error(y_train, y_train_pred)):.4f}")
print(f"测试 RMSE: {np.sqrt(mean_squared_error(y_test, y_test_pred)):.4f}")

# 绘制拟合曲线
X_plot = np.linspace(0, 1, 200).reshape(-1, 1)
X_plot_poly = poly.transform(X_plot)
y_plot = model.predict(X_plot_poly)

plt.scatter(X_train, y_train, label='训练数据')
plt.scatter(X_test, y_test, label='测试数据', marker='x')
plt.plot(X_plot, y_plot, 'r-', label='拟合曲线 (degree=20)')
plt.legend()
plt.title("过拟合示例：曲线剧烈振荡")
plt.show()

from sklearn.linear_model import Ridge

# 替换为 Ridge 回归（L2 正则化）
ridge = Ridge(alpha=0.1)   # alpha 是正则化强度
ridge.fit(X_train_poly, y_train)

y_train_pred_ridge = ridge.predict(X_train_poly)
y_test_pred_ridge = ridge.predict(X_test_poly)
print(f"Ridge 训练 RMSE: {np.sqrt(mean_squared_error(y_train, y_train_pred_ridge)):.4f}")
print(f"Ridge 测试 RMSE: {np.sqrt(mean_squared_error(y_test, y_test_pred_ridge)):.4f}")

# 绘制对比
y_plot_ridge = ridge.predict(X_plot_poly)
plt.scatter(X_train, y_train, alpha=0.6)
plt.scatter(X_test, y_test, alpha=0.6, marker='x')
plt.plot(X_plot, y_plot, 'r-', label='Linear (过拟合)', alpha=0.7)
plt.plot(X_plot, y_plot_ridge, 'g-', label=f'Ridge (alpha=0.1)', linewidth=2)
plt.legend()
plt.title("Ridge 回归减轻过拟合")
plt.show()