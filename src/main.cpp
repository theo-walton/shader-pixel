#include "Window.hpp"
#include "FreeCamera.hpp"
#include "FPSDisplay.hpp"
#include "Time.hpp"
#include "SkyBox.hpp"
#include "ObjRender.hpp"
#include "Scene.hpp"
#include "ShaderObj.hpp"
#include "Light.hpp"
#include "Transparency.hpp"
#include "ShadingProgram.hpp"

int	main(void)
{
	GLenum err;

	Window window(1280, 720, "ft_vox");
	glClearColor(0.2, 0.25, 0.3, 1);

	FPSDisplay fps;
	FreeCamera cam(window);
	Time clock;
	SkyBox sky(
		"assets/textures/skybox/right.png",
		"assets/textures/skybox/left.png",
		"assets/textures/skybox/top.png",
		"assets/textures/skybox/bottom.png",
		"assets/textures/skybox/front.png",
		"assets/textures/skybox/back.png"
	);
	ObjRender::Init();
	ShaderObj shader_object("src/shaders/marble.frag");
	Scene scene;

	Light l2(glm::vec3(0, 10, 0), glm::vec3(0.4, 0.9, 0.6));

	int lastSecond = 0;

	while (!window.ShouldClose())
	{
		if ((err = glGetError()) != GL_NO_ERROR)
			std::cerr << err << std::endl;
		clock.Step();

		if (int(clock.Total()) > lastSecond)
		{
			lastSecond = clock.Total();
			ShadingProgram::UpdateAll();
		}

		window.Clear();
		cam.Update(clock.Delta());
		scene.Render(cam.GetCameraData());
		sky.Render(cam.GetCameraData());

		shader_object.Render(cam.GetCameraData(),
			glm::translate(glm::mat4(1), glm::vec3(3, 2, 3)), clock.Total());

		Transparency::RenderAll();
		fps.Render(window);
		window.Render();
		if (window.Key(GLFW_KEY_ESCAPE))
			break;
	}
	window.Close();
}
