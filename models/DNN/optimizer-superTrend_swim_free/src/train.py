import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from preprocess import load_data

X_train, X_val, y_train, y_val = load_data('../data/solUSDT.json')

model = keras.Sequential([
    layers.Input(shape=(X_train.shape[1],)),
    layers.Dense(64, activation='relu'),
    layers.Dense(32, activation='relu'),
    layers.Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam',
              loss='binary_crossentropy',
              metrics=['accuracy'])

model.fit(X_train, y_train,
          validation_data=(X_val, y_val),
          epochs=20,
          batch_size=32)

model.save('../model/solUSDT_model.keras')
