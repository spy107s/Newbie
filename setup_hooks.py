#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import stat

def setup_hooks():
    src_dir = os.path.dirname(os.path.abspath(__file__))
    git_dir = os.path.join(src_dir, '.git')
    
    if not os.path.exists(git_dir):
        print("[ERR] Day khong phai la thu muc goc cua Git repository.")
        return
        
    hooks_dir = os.path.join(git_dir, 'hooks')
    os.makedirs(hooks_dir, exist_ok=True)
    
    # 1. Tao check_secrets.py trong .git/hooks/
    check_secrets_path = os.path.join(hooks_dir, 'check_secrets.py')
    check_secrets_content = """#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
import re

API_KEY_PATTERN = re.compile(r'\\bAIzaSy[A-Za-z0-9_-]{33}\\b')
BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
    '.mid', '.midi', '.mp3', '.wav', '.ogg',
    '.pyc', '.pyo', '.pyd', '.class', '.o', '.obj',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx'
}

def get_staged_files():
    try:
        output = subprocess.check_output(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=d'],
            stderr=subprocess.STDOUT
        )
        files = output.decode('utf-8', errors='ignore').strip().split('\\n')
        return [f.strip() for f in files if f.strip()]
    except subprocess.CalledProcessError as e:
        print(f"[PRE-COMMIT] Loi khi chay git diff: {e.output.decode('utf-8', errors='ignore')}")
        return []
    except Exception as e:
        print(f"[PRE-COMMIT] Loi he thong: {e}")
        return []

def is_binary(filepath):
    _, ext = os.path.splitext(filepath.lower())
    if ext in BINARY_EXTENSIONS:
        return True
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            if b'\\x00' in chunk:
                return True
    except Exception:
        pass
    return False

def scan_file(filepath):
    if not os.path.exists(filepath):
        return []
    if is_binary(filepath):
        return []
    leaks = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f, 1):
                matches = API_KEY_PATTERN.findall(line)
                if matches:
                    for match in matches:
                        masked_key = match[:8] + "..." + match[-4:]
                        leaks.append((idx, masked_key))
    except Exception as e:
        print(f"[PRE-COMMIT] Canh bao: Khong the doc file {filepath} de quet API key: {e}")
    return leaks

def main():
    staged_files = get_staged_files()
    if not staged_files:
        sys.exit(0)
    found_leak = False
    print("[PRE-COMMIT] Dang quet cac file chuan bi commit de kiem tra bao mat...")
    for filepath in staged_files:
        leaks = scan_file(filepath)
        if leaks:
            found_leak = True
            print(f"\\n[NGUY HIEM] Phat hien ro ri API Key trong file: {filepath}")
            for line_no, masked_key in leaks:
                print(f"  -> Dong {line_no}: Tim thay API key ({masked_key})")
    if found_leak:
        print("\\n[THAT BAI] Commit da bi chan de bao ve API Key cua ban!")
        print("[HUONG DAN]:")
        print("  1. Hay di chuyen API Key vao tep .env (da duoc cau hinh trong .gitignore).")
        print("  2. Nap API key tu moi truong thong qua thu vien/module cau hinh.")
        print("  3. Neu ban chac chan day la thong tin an toan va muon commit, hay dung: git commit --no-verify")
        sys.exit(1)
    print("[THANH CONG] Kiem tra bao mat hoan tat. Khong phat hien API Key ro ri.")
    sys.exit(0)

if __name__ == '__main__':
    main()
"""
    with open(check_secrets_path, 'w', encoding='utf-8') as f:
        f.write(check_secrets_content)
    
    # Set execute permission for check_secrets.py
    try:
        st = os.stat(check_secrets_path)
        os.chmod(check_secrets_path, st.st_mode | stat.S_IEXEC)
    except Exception:
        pass

    # 2. Tao pre-commit hook wrapper
    pre_commit_path = os.path.join(hooks_dir, 'pre-commit')
    pre_commit_content = """#!/bin/sh
python .git/hooks/check_secrets.py
"""
    with open(pre_commit_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(pre_commit_content)
        
    # Set execute permission for pre-commit
    try:
        st = os.stat(pre_commit_path)
        os.chmod(pre_commit_path, st.st_mode | stat.S_IEXEC)
    except Exception:
        pass

    print("[OK] Da cau hinh Git Pre-commit Hook thanh cong!")
    print("Moi khi ban thuc hien 'git commit', he thong se tu dong kiem tra API Key truoc khi cho phep commit.")

if __name__ == '__main__':
    setup_hooks()
