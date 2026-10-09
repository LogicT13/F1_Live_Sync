import re

with open("backend/services/live_state.py", "r") as f:
    content = f.read()

# Make sure segments is cleared along with sectors when S3 completes
# In get_frame:
#            if drv._s3_complete_time and (now - drv._s3_complete_time) > SECTOR_LINGER:
#                drv.sectors = None
#                drv._s3_complete_time = None
#                drv._sector_times.clear()

content = content.replace(
"""            if drv._s3_complete_time and (now - drv._s3_complete_time) > SECTOR_LINGER:
                drv.sectors = None
                drv._s3_complete_time = None
                drv._sector_times.clear()""",
"""            if drv._s3_complete_time and (now - drv._s3_complete_time) > SECTOR_LINGER:
                drv.sectors = None
                drv.segments = None
                drv._s3_complete_time = None
                drv._sector_times.clear()"""
)

# Also check _process_sectors logic for missing segments in ongoing sectors
# We need to make sure segments arrive correctly even if a sector value is NOT YET populated.
# F1 Timing Data: Sectors with segments that are currently being driven don't have "Value" yet.
# So we need to parse them before checking "if not val_str: continue".
