$(".tabbar ul li a").on("click touch", function (e) {
  e.preventDefault();

  const self = $(this);
  const li = self.parent();

  if (!li.hasClass("active")) {
    const active = self.parent().parent().children(".active");

    $("<em />").addClass("up").appendTo(active);
    $("<em />").addClass("up2").appendTo(active);
    $("<em />").addClass("up3").appendTo(active);
    $("<em />").addClass("down").appendTo(active);
    $("<em />").addClass("down2").appendTo(active);
    $("<em />").addClass("down3").appendTo(active);
    const em = active.children("em");

    // var offset = 0;
    let multipleSteps = false;
    const  left = active.position().left;
    const leftNew = self.parent().position().left;
    const  toRight = active.index() < li.index();

    if (toRight) {
      multipleSteps = li.index() - active.index() > 1;
      self.addClass("toRight");
      active.children("a").addClass("removeRight");
      em.css("--offset", leftNew - left);
    } else {
      multipleSteps = active.index() - li.index() > 1;
      self.addClass("toLeft");
      active.children("a").addClass("removeLeft");
      em.css("--offset", (left - leftNew) * -1);
    }

    em.addClass("move").toggleClass("multipleSteps", multipleSteps);

    setTimeout(function () {
      active.removeClass("active");
      active.children("a").removeClass("removeRight removeLeft");
    }, 300);

    setTimeout(function () {
      self.removeClass("toRight toLeft");
      self.parent().addClass("active");
      em.remove();
    }, 600);
  }
});
