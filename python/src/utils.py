import os
import re
import json
import logging
from pathlib import Path
import datetime

def sanitize_filename(filename):
    """
    ファイル名を安全な形式に変換する
    
    Args:
        filename (str): 元のファイル名
        
    Returns:
        str: 安全なファイル名
    """
    # 不正な文字を置換
    sanitized = re.sub(r'[^\w\-\.]', '_', filename)
    return sanitized

def ensure_directory_exists(directory_path):
    """
    ディレクトリが存在することを確認し、存在しない場合は作成する
    
    Args:
        directory_path (str): ディレクトリパス
    """
    Path(directory_path).mkdir(parents=True, exist_ok=True)

def format_duration(seconds):
    """
    秒数を読みやすい時間形式に変換する
    
    Args:
        seconds (float): 秒数
        
    Returns:
        str: フォーマットされた時間文字列
    """
    minutes, seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    
    if hours > 0:
        return f"{hours}時間{minutes}分{seconds}秒"
    elif minutes > 0:
        return f"{minutes}分{seconds}秒"
    else:
        return f"{seconds}秒"

def get_config(key=None, default=None):
    """
    設定値を取得する
    
    Args:
        key (str, optional): 取得する設定キー。Noneの場合は全設定を返す
        default (any, optional): キーが存在しない場合のデフォルト値
        
    Returns:
        any: 設定値またはデフォルト値
    """
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        if key is None:
            return config
        
        # ネストされたキーに対応（例: 'messageTemplates.recordingStart'）
        if '.' in key:
            parts = key.split('.')
            value = config
            for part in parts:
                if part in value:
                    value = value[part]
                else:
                    return default
            return value
        
        return config.get(key, default)
    except Exception as e:
        logging.error(f"設定の読み込み中にエラーが発生しました: {str(e)}")
        return default

def get_timestamp(format_str="%Y-%m-%dT%H-%M-%S"):
    """
    現在のタイムスタンプを指定された形式で取得する
    
    Args:
        format_str (str, optional): 日時フォーマット
        
    Returns:
        str: フォーマットされたタイムスタンプ
    """
    return datetime.datetime.now().strftime(format_str)

def get_file_size(file_path):
    """
    ファイルサイズを取得する
    
    Args:
        file_path (str): ファイルパス
        
    Returns:
        str: 人間が読みやすい形式のファイルサイズ
    """
    size_bytes = os.path.getsize(file_path)
    
    # サイズの単位変換
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024 or unit == 'GB':
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024