import type { SimScenario } from '@/lib/types'

/** Nội dung của mấy mô phỏng chạy bằng engine trên server.
 *
 *  Nằm trong code chứ không trong database, và không có màn quản trị: nội dung ở
 *  đây **là** code. Một form quản trị chỉ đẻ ra được cái nó biết trước hình dạng,
 *  mà mô phỏng thứ hai — hàng đợi, vòng lặp agent, gì đó khác — có hình dạng
 *  khác hẳn. Thêm một mô phỏng là một file cộng một dòng ở `registry.ts`, không
 *  migration, không hàng DB, không luồng publish.
 *
 *  Kịch bản đi kèm mỗi lần bấm Chạy: server tính rồi quên, không lưu gì. Việc
 *  client gửi lên cả kịch bản không mở ra chỗ hở nào — ở sân chơi không có gì
 *  được chấm, nên không có gì để gian lận. Bài lab **có** chấm điểm thì làm
 *  ngược lại: kịch bản đọc từ `labs.sim_scenario` phía server. */

export const NodeCi: SimScenario = {
  "catalog": {
    "lint": {
      "seconds": 25
    },
    "npm-ci": {
      "seconds": 90,
      "cacheable": "node_modules"
    },
    "checkout": {
      "seconds": 5
    },
    "npm-test": {
      "seconds": 120
    },
    "npm-build": {
      "seconds": 60,
      "produces": "dist"
    },
    "docker-build": {
      "seconds": 180,
      "consumes": "dist"
    }
  },
  "version": 1,
  "examples": [
    {
      "note": "một job làm hết — mọi việc chờ nhau",
      "title": "① Nối tiếp",
      "pipeline": "jobs:\n  ci:\n    steps: [checkout, npm-ci, npm-test, npm-build, docker-build]\n"
    },
    {
      "note": "tách hai job, bỏ needs — 2 runner cùng làm",
      "title": "② Song song",
      "pipeline": "jobs:\n  build:\n    steps: [checkout, npm-ci, npm-build]\n  test:\n    steps: [checkout, npm-ci, npm-test]\n"
    },
    {
      "note": "như ② nhưng khai cache — bấm Chạy HAI lượt",
      "title": "③ Thêm cache",
      "pipeline": "jobs:\n  build:\n    steps: [checkout, npm-ci, npm-build]\n    cache: [node_modules]\n  test:\n    steps: [checkout, npm-ci, npm-test]\n    cache: [node_modules]\n"
    },
    {
      "note": "như ② nhưng test đợi build mà chẳng dùng gì của nó",
      "title": "④ needs thừa",
      "pipeline": "jobs:\n  build:\n    steps: [checkout, npm-ci, npm-build]\n  test:\n    needs: [build]\n    steps: [checkout, npm-ci, npm-test]\n"
    }
  ],
  "runner_count": 2,
  "cache_restore_seconds": 10
}

export const FlakyE2e: SimScenario = {
  "catalog": {
    "e2e": {
      "flaky": 30,
      "seconds": 200
    },
    "lint": {
      "seconds": 25
    },
    "npm-ci": {
      "seconds": 90,
      "cacheable": "node_modules"
    },
    "checkout": {
      "seconds": 5
    },
    "npm-test": {
      "seconds": 120
    },
    "npm-build": {
      "seconds": 60,
      "produces": "dist"
    },
    "docker-build": {
      "seconds": 180,
      "consumes": "dist"
    }
  },
  "version": 1,
  "examples": [
    {
      "note": "chạy đi chạy lại cùng pipeline này — có lượt xanh, có lượt đỏ",
      "title": "e2e flaky",
      "pipeline": "jobs:\n  test:\n    steps: [checkout, npm-ci, npm-test]\n  e2e:\n    steps: [checkout, npm-ci, e2e]\n"
    },
    {
      "note": "3 runner: lint, test và e2e cùng chạy",
      "title": "Tách e2e ra nhánh riêng",
      "pipeline": "jobs:\n  lint:\n    steps: [checkout, npm-ci, lint]\n  test:\n    steps: [checkout, npm-ci, npm-test]\n  e2e:\n    steps: [checkout, npm-ci, e2e]\n"
    }
  ],
  "runner_count": 3,
  "cache_restore_seconds": 10
}
