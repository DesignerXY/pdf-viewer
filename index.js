// pdf 文档对象
let pdfDoc = null;
let currentPage = 1;

// pdf container
const pdfContainer = document.getElementById("pdf-container");
// pdf 页面输入框
const pageInput = document.getElementById("page-num");
// pdf 页面总数
const pageCount = document.getElementById("page-count");
// 缩放比例输入框
const scaleInput = document.getElementById("current-scale");
// 当前渲染缩放比例
let currentScale = 1;
// 印章数组
let stamps = [];

// 上一页
document.getElementById("prev").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    pageInput.value = currentPage;
  }
});
// 下一页
document.getElementById("next").addEventListener("click", () => {
  if (currentPage < pdfDoc.numPages) {
    currentPage++;
    renderPage(currentPage);
    pageInput.value = currentPage;
  }
});
// 跳转到指定页
pageInput.addEventListener("change", () => {
  const num = parseInt(pageInput.value);
  if (num >= 1 && num <= pdfDoc.numPages) {
    currentPage = num;
    renderPage(currentPage);
  }
});

// 放大
document.getElementById("zoom-in").addEventListener("click", () => {
  scaleChange(currentScale * 1.2);
});
// 改变缩放比例
scaleInput.addEventListener("change", () => {
  const scale = parseInt(scaleInput.value);
  scaleChange(scale);
});
// 缩小
document.getElementById("zoom-out").addEventListener("click", () => {
  scaleChange(currentScale / 1.2);
});
// 缩放比例变更
function scaleChange(scale) {
  // 保留一位小数
  scale = parseFloat(scale.toFixed(1));
  const scaleRatio = scale / currentScale;
  currentScale = scale;
  scaleInput.value = currentScale;
  // 比例缩放所有印章的x、y坐标
  stamps = stamps.map(stamp => ({
    ...stamp,
    x: stamp.x * scaleRatio,
    y: stamp.y * scaleRatio,
  }));
  renderPage(currentPage);
}

// 上传 PDF
document
  .getElementById("pdf-upload")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = function () {
        const typedArray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedArray).promise.then(function (pdfDoc_) {
          pdfDoc = pdfDoc_;
          document.getElementById("page-count").textContent = pdfDoc.numPages;
          renderPage(currentPage);
        });
      };
      fileReader.readAsArrayBuffer(file);
    }
  });

// 绑定上传印章按钮的点击事件
document.getElementById("upload-stamp").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = e => {
        // 上传后直接添加到当前页面
        const stamp = {
          index: stamps.length,
          page: currentPage, // 印章所属的页码
          x: 0, // 印章的 x 坐标，缩放后坐标
          y: 0, // 印章的 y 坐标，缩放后坐标
          rotation: 0, // 印章的旋转角度
          width: 0, // 印章的宽度，图片加载完成后会更新
          height: 0, // 印章的高度，图片加载完成后会更新
          // scale: currentScale, // 印章缩放比例，根据画布的来
          src: e.target.result,
        };
        stamps.push(stamp);
        console.log("印章上传成功");
        console.table(stamps);
        addStampToPage(stamp);
      };
      fileReader.readAsDataURL(file);
    }
  };
  input.click();
});
// 加载 PDF 文件
function loadPDF(url) {
  pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    pageCount.textContent = pdf.numPages;
    renderPage(currentPage);
  });
}

// 渲染页面
function renderPage(num) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: currentScale });
    pdfContainer.innerHTML = ""; // 清空容器

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // 把 pdf-container 的样式设置为 pdf 的大小
    pdfContainer.style.width = `${viewport.width}px`;
    pdfContainer.style.height = `${viewport.height}px`;
    // pdfContainer.style.transform = `scale(${currentScale})`;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    page.render(renderContext);

    pdfContainer.appendChild(canvas);

    // 添加已有的印章
    stamps.forEach(stamp => {
      if (stamp.page === num) {
        addStampToPage(stamp);
      }
    });

    // 调整所有印章的位置和大小
    adjustStamps();
  });
}

// 在页面上添加印章
function addStampToPage(stamp) {
  const img = new Image();
  img.src = stamp.src;
  img.className = "stamp";
  img.style.cursor = "move";
  img.style.position = "absolute";
  img.style.transformOrigin = "50% 50%";
  img.style.transform = `rotate(${stamp.rotation}deg)`;

  img.setAttribute("data-index", stamp.index);
  img.setAttribute("data-page", stamp.page);

  img.style.left = `${stamp.x}px`;
  img.style.top = `${stamp.y}px`;

  // 等待图片加载完成
  img.onload = function () {
    // 获取印章图片的实际宽度和高度
    stamp.width = stamp.width || img.width;
    stamp.height = stamp.height || img.height;

    // 调整印章的位置和大小
    adjustStamps();
  };

  // 创建旋转按钮
  const rotateButton = document.createElement("button");
  rotateButton.className = "rotate-button";
  rotateButton.textContent = "↻";
  // 点击旋转印章
  rotateButton.addEventListener("click", () => {
    const angle = 90;
    stamp.rotation += angle;
    stamp.rotation %= 360;

    // 设置旋转点为图片的中心
    // img.style.transformOrigin = "50% 50%";
    img.style.transform = `rotate(${stamp.rotation}deg)`;

    // 计算旋转后的边界
    const containerRect = pdfContainer.getBoundingClientRect();

    // 重新判断印章是否竖直放置
    const isVertical = [90, 270].includes(stamp.rotation);
    // 计算旋转后的宽高
    const rotatedWidth = isVertical ? img.height : img.width;
    const rotatedHeight = isVertical ? img.width : img.height;
    // 计算旋转后图片实际left 和 top定位相对于样式定义的偏差
    const minX = isVertical ? (img.height - img.width) / 2 : 0;
    const minY = isVertical ? (img.width - img.height) / 2 : 0;

    // 计算印章的最大和最小位置，考虑缩放比例
    const maxX = containerRect.width - rotatedWidth + minX;
    const maxY = containerRect.height - rotatedHeight + minY;

    let newX = stamp.x;
    let newY = stamp.y;
    // 限制印章的位置
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    stamp.x = newX;
    stamp.y = newY;

    img.style.left = `${stamp.x}px`;
    img.style.top = `${stamp.y}px`;
  });
  function showRotateButton() {
    // 重新判断印章是否竖直放置
    const isVertical = [90, 270].includes(stamp.rotation);
    // 计算旋转后图片实际left 和 top定位相对于样式定义的偏差
    const imgLeft = isVertical
      ? img.offsetLeft + (img.offsetHeight - img.offsetWidth) / 2
      : img.offsetLeft;
    const imgTop = isVertical
      ? img.offsetTop - (img.offsetWidth - img.offsetHeight) / 2
      : img.offsetTop;
    rotateButton.style.left = `${imgLeft + img.offsetWidth - 10}px`;
    rotateButton.style.top = `${imgTop - 10}px`;
    rotateButton.style.display = "block";
  }
  // 光标悬浮在图片上时显示旋转按钮
  img.addEventListener("mouseenter", showRotateButton);
  // 光标悬浮在旋转按钮上时保持显示
  rotateButton.addEventListener("mouseenter", showRotateButton);
  // 光标离开图片时隐藏旋转按钮
  img.addEventListener("mouseleave", () => {
    rotateButton.style.display = "none";
  });

  img.addEventListener("mousedown", e => {
    e.preventDefault();
    let isDragging = true;
    // 鼠标点击位置相对于印章的偏移量
    let offsetX = e.clientX - stamp.x;
    let offsetY = e.clientY - stamp.y;

    function onMouseMove(e) {
      if (isDragging) {
        // 计算新的位置
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // 获取容器的边界
        const containerRect = pdfContainer.getBoundingClientRect();

        // 重新判断印章是否竖直放置
        const isVertical = [90, 270].includes(stamp.rotation);
        // 计算旋转后的宽高
        const rotatedWidth = isVertical ? img.height : img.width;
        const rotatedHeight = isVertical ? img.width : img.height;
        // 计算旋转后图片实际left 和 top定位相对于样式定义的偏差
        const minX = isVertical ? (img.height - img.width) / 2 : 0;
        const minY = isVertical ? (img.width - img.height) / 2 : 0;

        // 计算印章的最大和最小位置，考虑缩放比例
        const maxX = containerRect.width - rotatedWidth + minX;
        const maxY = containerRect.height - rotatedHeight + minY;

        // 限制印章的位置
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        stamp.x = newX;
        stamp.y = newY;
        img.style.left = `${stamp.x}px`;
        img.style.top = `${stamp.y}px`;

        showRotateButton();
      }
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      // 打印印章的定位信息
      const imgRect = img.getBoundingClientRect();
      const containerRect = pdfContainer.getBoundingClientRect();
      const stampTop = imgRect.top - containerRect.top;
      const stampLeft = imgRect.left - containerRect.left;
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const stampWidth = imgRect.width;
      const stampHeight = imgRect.height;
      const stampTopPercent = (stampTop / containerHeight) * 100;
      const stampLeftPercent = (stampLeft / containerWidth) * 100;
      console.log("<<<<<<<<<<<>>>>>>>>>>>");
      console.log(`印章定位: top=${stampTop}px, left=${stampLeft}px`);
      console.log(
        `画布尺寸: height=${containerHeight}px, width=${containerWidth}px`
      );
      console.log(
        `印章百分比定位: top=${stampTopPercent.toFixed(2)}%, left=${stampLeftPercent.toFixed(2)}%`
      );
      console.log(`图片尺寸: height=${stampHeight}px, width=${stampWidth}px`);
      console.log("<<<<<<<<<<<>>>>>>>>>>>");
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  pdfContainer.appendChild(img);
  pdfContainer.appendChild(rotateButton);
}

// 调整所有印章的位置和大小
function adjustStamps() {
  stamps.forEach(stamp => {
    if (stamp.page === currentPage) {
      const img = document.querySelector(`.stamp[data-index="${stamp.index}"]`);
      if (img) {
        const scaleRatio = currentScale;
        img.style.left = `${stamp.x}px`;
        img.style.top = `${stamp.y}px`;
        img.style.width = `${stamp.width * scaleRatio}px`;
        img.style.height = `${stamp.height * scaleRatio}px`;
        // img.style.transform = `scale(${scaleRatio}) rotate(${stamp.rotation}deg)`;
        img.style.transform = `rotate(${stamp.rotation}deg)`;
      }
    }
  });
}

// 初始化加载示例 PDF
loadPDF("./test.pdf");
