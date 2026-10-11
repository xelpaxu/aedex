import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import csv
import os

users = [
    {"num": 1, "name": "Alfredo Tagudando", "email": "alfredo.tagudando@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 2, "name": "Ranel Clarence David", "email": "ranel.david@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 3, "name": "Paul Vincent Marqueses", "email": "paul.marqueses@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 4, "name": "Shane Monteverde", "email": "shane.monteverde@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 5, "name": "Renato Dela Torre", "email": "renato.delatorre@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 6, "name": "Nenita Donasco", "email": "nenita.donasco@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 7, "name": "Roger Donasco", "email": "roger.donasco@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 8, "name": "Mary Rose Rodriguez", "email": "maryrose.rodriguez@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 9, "name": "Mary Grace Rodriguez Arcenio", "email": "marygrace.arcenio@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 10, "name": "Stephine Perasol", "email": "stephine.perasol@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 11, "name": "Analyn Navaja", "email": "analyn.navaja@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 12, "name": "Jonalyn Juares", "email": "jonalyn.juares@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 13, "name": "Jho Leen Dah Gecole", "email": "jholeendah.gecole@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 14, "name": "Gerald Ganje", "email": "gerald.ganje@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 15, "name": "Lanz Edward Cabaylo", "email": "lanz.cabaylo@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
    {"num": 16, "name": "Rednine Bahin", "email": "rednine.bahin@gmail.com", "password": "vecpro123", "role": "Resident / Tanod", "status": "Pre-Verified"},
]

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "AEDEX Accounts"

# Title Row
ws.merge_cells("A1:F1")
title_cell = ws["A1"]
title_cell.value = "AEDEX / VECPRO - Authorized User Accounts"
title_cell.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
title_cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
title_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 36

# Subtitle Row
ws.merge_cells("A2:F2")
sub_cell = ws["A2"]
sub_cell.value = "Pre-verified credentials with bypassed 2FA and uniform initial passwords"
sub_cell.font = Font(name="Calibri", size=11, italic=True, color="94A3B8")
sub_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
sub_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[2].height = 24

# Headers
headers = ["#", "Full Name", "Email Address", "Password", "Default Role", "Status"]
ws.append([]) # row 3 empty spacer
ws.row_dimensions[3].height = 10

header_row = 4
for col_idx, header in enumerate(headers, start=1):
    cell = ws.cell(row=header_row, column=col_idx, value=header)
    cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell.fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    cell.alignment = Alignment(horizontal="center" if col_idx in [1, 4, 5, 6] else "left", vertical="center")
ws.row_dimensions[header_row].height = 28

# Border styles
thin_border = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

# Insert Data
start_row = 5
for idx, user in enumerate(users):
    current_row = start_row + idx
    row_data = [
        user["num"],
        user["name"],
        user["email"],
        user["password"],
        user["role"],
        user["status"]
    ]
    
    fill_color = "F8FAFC" if idx % 2 == 1 else "FFFFFF"
    row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
    
    for col_idx, val in enumerate(row_data, start=1):
        cell = ws.cell(row=current_row, column=col_idx, value=val)
        cell.font = Font(name="Calibri", size=11, color="0F172A")
        cell.fill = row_fill
        cell.border = thin_border
        
        if col_idx == 1:
            cell.alignment = Alignment(horizontal="center", vertical="center")
        elif col_idx in [4, 5]:
            cell.alignment = Alignment(horizontal="center", vertical="center")
        elif col_idx == 6:
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.font = Font(name="Calibri", size=11, bold=True, color="16A34A")
        else:
            cell.alignment = Alignment(horizontal="left", vertical="center")
            
    ws.row_dimensions[current_row].height = 22

# Auto-fit column widths
column_widths = {1: 8, 2: 32, 3: 36, 4: 16, 5: 20, 6: 18}
for col_idx, width in column_widths.items():
    col_letter = get_column_letter(col_idx)
    ws.column_dimensions[col_letter].width = width

# Save Excel files in both aedex root and parent vecpro root
xlsx_path_aedex = "AEDEX_User_Accounts.xlsx"
xlsx_path_parent = os.path.join("..", "AEDEX_User_Accounts.xlsx")
wb.save(xlsx_path_aedex)
wb.save(xlsx_path_parent)

# Also generate CSV
csv_path_aedex = "AEDEX_User_Accounts.csv"
csv_path_parent = os.path.join("..", "AEDEX_User_Accounts.csv")

for p in [csv_path_aedex, csv_path_parent]:
    with open(p, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["#", "Full Name", "Email Address", "Password", "Default Role", "Status"])
        for u in users:
            writer.writerow([u["num"], u["name"], u["email"], u["password"], u["role"], u["status"]])

print("Successfully generated AEDEX_User_Accounts.xlsx and AEDEX_User_Accounts.csv!")
