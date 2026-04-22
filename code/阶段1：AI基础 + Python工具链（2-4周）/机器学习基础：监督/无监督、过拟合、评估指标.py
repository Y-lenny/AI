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



from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.model_selection import train_test_split
import numpy as np

# 生成非线性数据
np.random.seed(42)
X = np.linspace(0, 1, 30).reshape(-1,1)
y = np.sin(2 * np.pi * X).ravel() + np.random.normal(0, 0.1, X.shape[0])

# 故意用高阶多项式（过拟合）
poly = PolynomialFeatures(degree=20)
X_poly = poly.fit_transform(X)
model = LinearRegression().fit(X_poly, y)

# 对比训练集误差 vs 测试集误差 -> 过拟合明显