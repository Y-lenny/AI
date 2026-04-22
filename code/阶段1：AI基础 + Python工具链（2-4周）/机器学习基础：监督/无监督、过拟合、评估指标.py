# 监督：用鸢尾花数据集做分类
import importlib


try:
    load_iris = importlib.import_module("sklearn.datasets").load_iris
    DecisionTreeClassifier = importlib.import_module("sklearn.tree").DecisionTreeClassifier
    KMeans = importlib.import_module("sklearn.cluster").KMeans
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(
        "缺少依赖 scikit-learn。请先安装：python -m pip install scikit-learn"
    ) from exc

X, y = load_iris(return_X_y=True)
clf = DecisionTreeClassifier().fit(X, y)


# 无监督：用同一数据集做聚类（不用标签y）
kmeans = KMeans(n_clusters=3).fit(X)
print(kmeans.labels_)  # 看它分出的类是否和真实标签接近