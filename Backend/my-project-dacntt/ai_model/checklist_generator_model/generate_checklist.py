import os
import sys
import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')

title = sys.argv[1]
description = sys.argv[2]

#  Model nằm ngay trong cùng thư mục (vì script và model cùng cấp)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = BASE_DIR  # load ngay trong cùng thư mục

# print(" Đang load model từ:", model_path)
 
tokenizer = T5Tokenizer.from_pretrained(model_path)
model = T5ForConditionalGeneration.from_pretrained(model_path)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)

input_text = f"Sinh checklist cho công việc: {title}. Mô tả: {description}"
input_ids = tokenizer.encode(input_text, return_tensors="pt").to(device)

output = model.generate(input_ids, max_length=100, num_beams=5, early_stopping=True)
checklist = tokenizer.decode(output[0], skip_special_tokens=True)

# print("Checklist sinh ra:")
print(checklist)
